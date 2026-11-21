# keyrigme-server — Migration Go/PostgreSQL

**Date:** 2026-06-03
**Remplace:** `apps/keyrigme-back` (NestJS + MongoDB + RabbitMQ)
**Destination:** `apps/keyrigme-server` (Go + PostgreSQL + River + WebSocket natif)

---

## Contexte

`keyrigme-back` est un backend NestJS qui expose un jeu de quiz en temps réel via Socket.IO. Il utilise MongoDB pour la persistance et RabbitMQ (x-delayed-message) pour scheduler l'envoi des questions et la fin de partie.

Cette migration remplace l'intégralité du backend par du Go, en conservant le même contrat métier (événements, logique de salle, scoring) tout en modernisant la stack infrastructure.

---

## Stack cible

| Couche | Choix | Justification |
|---|---|---|
| Runtime | Go 1.23 | Performances, typage fort, concurrence native |
| Base de données | PostgreSQL + pgx v5 | Remplace MongoDB, relationnel + JSONB pour les champs dynamiques |
| Accès DB | sqlc | Génère du Go type-safe depuis SQL brut, zéro ORM |
| Migrations | goose | Fichiers SQL versionnés |
| Job queue | riverqueue/river | Remplace RabbitMQ, jobs persistés dans PostgreSQL |
| WebSocket | nhooyr.io/websocket | Remplace Socket.IO, WebSocket natif Go |
| Front transport | RxJS `webSocket` | Remplace `socket.io-client`, déjà disponible dans Angular |

---

## Architecture — Layered avec interface de notification

```
apps/keyrigme-server/
├── cmd/
│   ├── server/
│   │   └── main.go                  # bootstrap, injection manuelle des dépendances
│   └── migrate/
│       └── main.go                  # goose up/down, appelé par nx run keyrigme-server:migrate
├── internal/
│   ├── handler/
│   │   ├── http.go                  # GET /questions/count-by-category, /seed, /reset
│   │   └── ws.go                    # upgrade WebSocket, dispatch des events entrants
│   ├── hub/
│   │   ├── hub.go                   # connexions actives, rooms en mémoire, implémente RoomNotifier
│   │   └── client.go                # goroutine read/write par connexion WebSocket
│   ├── service/
│   │   ├── notifier.go              # interface RoomNotifier
│   │   ├── question.go              # CountByCategory, GetRandom, Seed, Reset
│   │   └── room.go                  # logique complète de partie
│   ├── db/
│   │   ├── migrations/              # fichiers SQL goose (001_init.sql, …)
│   │   ├── query/                   # *.sql source pour sqlc
│   │   └── sqlc/                    # code Go généré par sqlc (ne pas éditer)
│   └── worker/
│       ├── send_question.go         # River job : envoie newRoundData à t+delay
│       └── end_quizz.go             # River job : passe la room en Review
├── sqlc.yaml
├── go.mod
└── project.json
```

**Principe clé :** les services (`RoomService`, `QuestionService`) ne dépendent pas du hub concret. Ils reçoivent une interface `RoomNotifier`. Le hub concret implémente cette interface. Cela rend les services testables avec un mock trivial.

```go
// internal/service/notifier.go
type RoomNotifier interface {
    NotifyRoom(roomID string, event string, payload any)
    NotifySocket(socketID string, event string, payload any)
}
```

---

## Schéma PostgreSQL

### Table `questions`

```sql
CREATE TABLE questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  points       INT         NOT NULL DEFAULT 3  CHECK (points > 0),
  timer_ms     INT         NOT NULL DEFAULT 10000 CHECK (timer_ms > 0),
  categories   TEXT[]      NOT NULL DEFAULT '{}',
  type         TEXT        NOT NULL CHECK (type IN ('Media', 'Order', 'Text')),

  -- Media + Text
  answer       TEXT,

  -- Media
  files        TEXT[]      NOT NULL DEFAULT '{}',
  media_type   TEXT        CHECK (media_type IS NULL OR media_type IN ('Audio', 'Image')),

  -- Order (items complexes : {id, label, file})
  order_items  JSONB       NOT NULL DEFAULT '[]',
  answer_items TEXT[]      NOT NULL DEFAULT '{}',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (type = 'Text'
      AND answer IS NOT NULL
      AND media_type IS NULL
      AND files = '{}'
      AND order_items = '[]'::jsonb
      AND answer_items = '{}')
    OR
    (type = 'Media'
      AND answer IS NOT NULL
      AND media_type IS NOT NULL
      AND order_items = '[]'::jsonb
      AND answer_items = '{}')
    OR
    (type = 'Order'
      AND answer IS NULL
      AND media_type IS NULL
      AND files = '{}'
      AND jsonb_array_length(order_items) > 0
      AND array_length(answer_items, 1) IS NOT NULL)
  )
);

CREATE INDEX idx_questions_categories ON questions USING GIN (categories);
```

### Table `rooms`

```sql
CREATE TABLE rooms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'Initial'
                            CHECK (status IN ('Initial', 'Started', 'Review', 'Ended')),
  no_of_players INT         NOT NULL DEFAULT 10 CHECK (no_of_players > 0),
  no_of_rounds  INT         NOT NULL DEFAULT 5  CHECK (no_of_rounds > 0),
  categories    TEXT[]      NOT NULL DEFAULT '{}',

  -- Pas de socketId en base : les connexions WebSocket vivent uniquement dans le hub
  owner         JSONB       NOT NULL,               -- {username, avatar}
  players       JSONB       NOT NULL DEFAULT '[]',  -- [{username, avatar}]
  answers       JSONB       NOT NULL DEFAULT '{}',  -- {questionId: {socketId: {response, point}}}
  bonus         JSONB       NOT NULL DEFAULT '{}',  -- {socketId: {point}}

  questions     UUID[]      NOT NULL DEFAULT '{}',

  -- Optimistic locking pour les updates concurrents sur answers
  version       INT         NOT NULL DEFAULT 1,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_code       ON rooms (code);
CREATE INDEX idx_rooms_status     ON rooms (status);
CREATE INDEX idx_rooms_categories ON rooms USING GIN (categories);
```

**Note sur `socketId` :** les socketIds sont éphémères (changent à chaque reconnexion). Ils ne sont jamais persistés en base. Le hub maintient en mémoire :
- `owners map[roomID]socketID` — qui est le owner actif
- `rooms  map[roomID]map[socketID]bool` — quels sockets sont dans quelle room

L'autorisation (« ce socket est-il le owner ? ») est une responsabilité du hub, pas de la DB. Le hub expose `IsOwner(roomID, socketID string) bool` utilisé par `RoomService` avant toute opération owner-only.

---

## Hub — état mémoire

```go
type Hub struct {
    mu      sync.RWMutex
    clients map[string]*Client          // socketID → *Client
    rooms   map[string]map[string]bool  // roomID   → set de socketIDs membres
    owners  map[string]string           // roomID   → socketID du owner
}

// Implémente service.RoomNotifier
func (h *Hub) NotifyRoom(roomID, event string, payload any)   // broadcast à tous les membres
func (h *Hub) NotifySocket(socketID, event string, payload any) // envoi ciblé
```

---

## Protocole WebSocket

Tous les messages client→server et server→client suivent une enveloppe JSON uniforme :

```json
// Client → Server
{ "event": "createRoom", "data": { "username": "alice", "avatar": "🦊" } }

// Server → Client
{ "event": "roomCreated", "data": { ...room } }
{ "event": "error",       "data": { "message": "Room is full." } }
```

### Événements client → server

| Event | Payload |
|---|---|
| `createRoom` | `{username, avatar}` |
| `joinRoom` | `{code, username, avatar}` |
| `updateRoomConfig` | `{roomId, noOfPlayers, noOfRounds, categories}` |
| `startQuizz` | `roomId` (string) |
| `playerAnswer` | `{roomId, questionId, response}` |
| `showAnswers` | `roomId` (string) |
| `setUserPoints` | `{roomId, answers}` |
| `changeIndexAnswers` | `{roomId, index}` |
| `removePlayer` | `{roomId, playerId}` |
| `leaveRoom` | `roomId` (string) |

### Événements server → client

| Event | Déclencheur |
|---|---|
| `roomCreated` | owner crée une salle |
| `roomJoined` | joueur rejoint (envoyé à lui seul) |
| `addPlayer` | joueur rejoint (broadcast room) |
| `roomConfigUpdated` | config modifiée |
| `quizzStarted` | partie démarrée |
| `newRoundData` | River job envoie la question suivante |
| `endQuizz` | River job fin de timer |
| `showAnswers` | owner demande les réponses |
| `showResult` | owner valide les points |
| `changeIndexAnswers` | owner change l'index affiché |
| `removedPlayer` | joueur expulsé ou parti |
| `error` | validation ou erreur métier |

---

## Services

### `QuestionService`

| Méthode | Description |
|---|---|
| `CountByCategory(ctx)` | Retourne `[]CategoryCount{id, label, count}` |
| `GetRandom(ctx, n, categories)` | Tire n questions aléatoires parmi les catégories |
| `Seed(ctx)` | Insère les questions de seed si la table est vide |
| `Reset(ctx)` | Supprime tout et réinsère le seed |

Pas de `RoomNotifier` — opérations pures DB.

### `RoomService`

Reçoit `RoomNotifier` en injection. Chaque méthode appelle la DB puis notifie.

| Méthode | Actions |
|---|---|
| `Create(ctx, socketID, username, avatar)` | INSERT room, hub.SetOwner, NotifySocket(roomCreated) |
| `Join(ctx, socketID, code, username, avatar)` | UPDATE players, hub.Join, NotifyRoom(addPlayer) + NotifySocket(roomJoined) |
| `UpdateConfig(ctx, socketID, dto)` | Vérifie owner via hub, UPDATE config, NotifyRoom(roomConfigUpdated) |
| `Start(ctx, socketID, roomID)` | Vérifie owner, UPDATE status=Started, GetRandom, schedule River jobs, NotifyRoom(quizzStarted) |
| `SetAnswer(ctx, socketID, roomID, questionID, response)` | UPDATE answers avec SELECT FOR UPDATE + version check |
| `ShowAnswers(ctx, socketID, roomID)` | Vérifie owner, SELECT room + populate questions, NotifyRoom(showAnswers) |
| `SetPointsAndEnd(ctx, socketID, roomID, answers)` | Vérifie owner, UPDATE answers+status=Ended, NotifyRoom(showResult) |
| `PassToReview(ctx, roomID)` | UPDATE status=Review (appelé par EndQuizzWorker) |
| `RemovePlayer(ctx, socketID, roomID, playerID)` | Vérifie owner, UPDATE players, NotifyRoom(removedPlayer) |
| `Leave(ctx, socketID, roomID)` | UPDATE players, NotifyRoom(removedPlayer) |
| `ChangeIndexAnswers(ctx, socketID, roomID, index)` | Vérifie owner + status=Review, NotifyRoom(changeIndexAnswers) |

---

## Workers River

```go
// SendQuestionWorker — schedulé à t+delay pour chaque question de la partie
type SendQuestionArgs struct {
    RoomID   string
    Question db.Question
}
func (w *SendQuestionWorker) Work(ctx, job) error {
    w.notifier.NotifyRoom(job.Args.RoomID, "newRoundData", job.Args.Question)
    return nil
}

// EndQuizzWorker — schedulé à t+totalDuration
type EndQuizzArgs struct { RoomID string }
func (w *EndQuizzWorker) Work(ctx, job) error {
    w.roomService.PassToReview(ctx, job.Args.RoomID)
    w.notifier.NotifyRoom(job.Args.RoomID, "endQuizz", nil)
    return nil
}
```

Le scheduling dans `RoomService.Start` :

```go
// delay cumulatif : question i part à sum(timer_ms des questions 0..i-1)
for i, q := range questions {
    river.InsertTx(ctx, tx, SendQuestionArgs{RoomID, q}, &river.InsertOpts{
        ScheduledAt: time.Now().Add(delay),
    })
    delay += time.Duration(q.TimerMs) * time.Millisecond
}
river.InsertTx(ctx, tx, EndQuizzArgs{RoomID}, &river.InsertOpts{
    ScheduledAt: time.Now().Add(delay),
})
```

---

## Variables d'environnement

```bash
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/keyrigme
CORS_ORIGINS=http://localhost:4200
```

Suppression de `RABBITMQ_*`, `DATABASE_HOST`, `DATABASE_PORT`.

---

## Routes HTTP

```
GET /questions/count-by-category
GET /questions/seed
GET /questions/reset
GET /ws                            # upgrade WebSocket
```

---

## Intégration Nx

```json
{
  "name": "keyrigme-server",
  "projectType": "application",
  "targets": {
    "build":    { "executor": "nx:run-commands", "options": { "command": "go build -o dist/keyrigme-server ./cmd/server", "cwd": "apps/keyrigme-server" } },
    "serve":    { "continuous": true, "executor": "nx:run-commands", "options": { "command": "go run ./cmd/server", "cwd": "apps/keyrigme-server" } },
    "test":     { "executor": "nx:run-commands", "options": { "command": "go test ./...", "cwd": "apps/keyrigme-server" } },
    "generate": { "executor": "nx:run-commands", "options": { "command": "sqlc generate", "cwd": "apps/keyrigme-server" } },
    "migrate":  { "executor": "nx:run-commands", "options": { "command": "go run ./cmd/migrate up", "cwd": "apps/keyrigme-server" } },
    "lint":     { "executor": "nx:run-commands", "options": { "command": "golangci-lint run ./...", "cwd": "apps/keyrigme-server" } }
  }
}
```

---

## Ce qui est hors scope

- Authentification / gestion d'utilisateurs (absente du backend actuel)
- Administration des questions via une UI (actuellement seed/reset en HTTP)
- Migration des données MongoDB existantes (le seed Go repart de zéro)
- Suppression de `keyrigme-back` (à faire manuellement une fois `keyrigme-server` validé en prod)
