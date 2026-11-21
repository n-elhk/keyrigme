# keyrigme-server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer `keyrigme-back` (NestJS/MongoDB/RabbitMQ/Socket.IO) vers `keyrigme-server` (Go/PostgreSQL/River/WebSocket natif) en conservant le même contrat métier.

**Architecture:** Layered (handler → service → db) avec `RoomNotifier` interface pour découpler les services du hub WebSocket concret. Les socketIds ne sont jamais persistés en base ; l'autorisation (owner) est gérée par le hub en mémoire. Les joueurs sont identifiés par leur `username` dans `answers` et `bonus`.

**Tech Stack:** Go 1.23, pgx v5, sqlc, goose, riverqueue/river, nhooyr.io/websocket, google/uuid — Frontend : RxJS `webSocket` (remplace ngx-socket-io)

**Spec:** `docs/superpowers/specs/2026-06-03-keyrigme-server-go-design.md`

---

## Fichiers créés / modifiés

### Backend — `apps/keyrigme-server/`
| Fichier | Rôle |
|---|---|
| `go.mod` | Module Go, dépendances |
| `sqlc.yaml` | Config sqlc |
| `project.json` | Cibles Nx |
| `cmd/server/main.go` | Bootstrap, injection dépendances |
| `cmd/migrate/main.go` | goose up/down + River migration |
| `internal/db/migrations/001_init.sql` | Schema PostgreSQL |
| `internal/db/query/questions.sql` | Requêtes sqlc questions |
| `internal/db/query/rooms.sql` | Requêtes sqlc rooms |
| `internal/db/sqlc/` | Code Go généré par sqlc (ne pas éditer) |
| `internal/service/notifier.go` | Interface `RoomNotifier` |
| `internal/service/args.go` | Types River job args (SendQuestionArgs, EndQuizzArgs) |
| `internal/hub/hub.go` | Hub WebSocket (connexions, rooms, owners) |
| `internal/hub/client.go` | Client WebSocket (goroutines read/write) |
| `internal/service/question.go` | QuestionService |
| `internal/service/question_test.go` | Tests QuestionService |
| `internal/service/room.go` | RoomService |
| `internal/service/room_test.go` | Tests RoomService |
| `internal/worker/send_question.go` | River job SendQuestion |
| `internal/worker/end_quizz.go` | River job EndQuizz |
| `internal/worker/workers_test.go` | Tests workers |
| `internal/handler/http.go` | GET /questions/... |
| `internal/handler/ws.go` | Upgrade WS + dispatch events |

### Frontend
| Fichier | Rôle |
|---|---|
| `libs/keyrigme-models/src/lib/types/room.type.ts` | Supprimer `socketId` de `Player`, renommer `_id` → `id` |
| `apps/keyrigme-front/src/app/app.config.ts` | Supprimer `provideSocketIo` |
| `apps/keyrigme-front/src/app/shared/services/quizz-socket.service.ts` | Réécrire avec RxJS `webSocket` |
| `apps/keyrigme-front/src/app/store/quizz/quizz.store.ts` | `isOwner` par username, ajouter `myUsername` |
| `apps/keyrigme-front/src/app/store/quizz/quizz.type.ts` | Ajouter `myUsername` au state |

---

## Task 1 : Bootstrap projet + configuration

**Files:**
- Create: `apps/keyrigme-server/go.mod`
- Create: `apps/keyrigme-server/sqlc.yaml`
- Create: `apps/keyrigme-server/project.json`

- [ ] **Étape 1 : Créer la structure de répertoires**

```bash
mkdir -p apps/keyrigme-server/{cmd/{server,migrate},internal/{db/{migrations,query,sqlc},service,hub,handler,worker}}
```

- [ ] **Étape 2 : Créer `go.mod`**

Créer `apps/keyrigme-server/go.mod` :

```
module keyrigme-server

go 1.23

require (
	github.com/google/uuid v1.6.0
	github.com/jackc/pgx/v5 v5.7.2
	github.com/pressly/goose/v3 v3.24.3
	github.com/riverqueue/river v0.14.2
	github.com/riverqueue/river/riverdriver/riverpgxv5 v0.14.2
	github.com/riverqueue/river/rivermigrate v0.14.2
	nhooyr.io/websocket v1.8.17
)
```

- [ ] **Étape 3 : Télécharger les dépendances**

```bash
cd apps/keyrigme-server && go mod tidy
```

Résultat attendu : `go.sum` créé, aucune erreur.

- [ ] **Étape 4 : Créer `sqlc.yaml`**

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "internal/db/query/"
    schema: "internal/db/migrations/"
    gen:
      go:
        package: "dbsqlc"
        out: "internal/db/sqlc"
        sql_package: "pgx/v5"
        emit_interface: true
        emit_json_tags: true
        overrides:
          - db_type: "jsonb"
            go_type: "encoding/json.RawMessage"
          - db_type: "pg_catalog.uuid"
            go_type:
              import: "github.com/google/uuid"
              type: "UUID"
```

- [ ] **Étape 5 : Créer `project.json`**

```json
{
  "name": "keyrigme-server",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go build -o ../../dist/apps/keyrigme-server/server ./cmd/server",
        "cwd": "apps/keyrigme-server"
      }
    },
    "serve": {
      "continuous": true,
      "executor": "nx:run-commands",
      "options": {
        "command": "go run ./cmd/server",
        "cwd": "apps/keyrigme-server"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go test ./...",
        "cwd": "apps/keyrigme-server"
      }
    },
    "generate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "sqlc generate",
        "cwd": "apps/keyrigme-server"
      }
    },
    "migrate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go run ./cmd/migrate up",
        "cwd": "apps/keyrigme-server"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "golangci-lint run ./...",
        "cwd": "apps/keyrigme-server"
      }
    }
  }
}
```

- [ ] **Étape 6 : Commit**

```bash
git add apps/keyrigme-server/
git commit -m "feat(keyrigme-server): bootstrap Go project structure"
```

---

## Task 2 : Migration SQL + cmd/migrate

**Files:**
- Create: `apps/keyrigme-server/internal/db/migrations/001_init.sql`
- Create: `apps/keyrigme-server/cmd/migrate/main.go`

- [ ] **Étape 1 : Créer `001_init.sql`**

```sql
-- +goose Up

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  points       INT         NOT NULL DEFAULT 3,
  timer_ms     INT         NOT NULL DEFAULT 10000,
  categories   TEXT[]      NOT NULL DEFAULT '{}',
  type         TEXT        NOT NULL CHECK (type IN ('Media', 'Order', 'Text')),
  answer       TEXT,
  files        TEXT[]      NOT NULL DEFAULT '{}',
  media_type   TEXT        CHECK (media_type IS NULL OR media_type IN ('Audio', 'Image')),
  order_items  JSONB       NOT NULL DEFAULT '[]',
  answer_items TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (points > 0),
  CHECK (timer_ms > 0),
  CHECK (
    (type = 'Text'
      AND answer IS NOT NULL AND media_type IS NULL
      AND files = '{}' AND order_items = '[]'::jsonb AND answer_items = '{}')
    OR
    (type = 'Media'
      AND answer IS NOT NULL AND media_type IS NOT NULL
      AND order_items = '[]'::jsonb AND answer_items = '{}')
    OR
    (type = 'Order'
      AND answer IS NULL AND media_type IS NULL AND files = '{}'
      AND jsonb_array_length(order_items) > 0
      AND array_length(answer_items, 1) IS NOT NULL)
  )
);

CREATE INDEX idx_questions_categories ON questions USING GIN (categories);

CREATE TABLE rooms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'Initial'
                            CHECK (status IN ('Initial', 'Started', 'Review', 'Ended')),
  no_of_players INT         NOT NULL DEFAULT 10 CHECK (no_of_players > 0),
  no_of_rounds  INT         NOT NULL DEFAULT 5  CHECK (no_of_rounds > 0),
  categories    TEXT[]      NOT NULL DEFAULT '{}',
  owner         JSONB       NOT NULL,
  players       JSONB       NOT NULL DEFAULT '[]',
  answers       JSONB       NOT NULL DEFAULT '{}',
  bonus         JSONB       NOT NULL DEFAULT '{}',
  questions     UUID[]      NOT NULL DEFAULT '{}',
  version       INT         NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_code       ON rooms (code);
CREATE INDEX idx_rooms_status     ON rooms (status);
CREATE INDEX idx_rooms_categories ON rooms USING GIN (categories);

-- +goose Down
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS questions;
```

- [ ] **Étape 2 : Créer `cmd/migrate/main.go`**

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: migrate <up|down|status>")
	}
	direction := os.Args[1]
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	riverMigrator, err := rivermigrate.New(riverpgxv5.New(pool), nil)
	if err != nil {
		log.Fatalf("river migrator: %v", err)
	}
	switch direction {
	case "up":
		if _, err := riverMigrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
			log.Fatalf("river migrate up: %v", err)
		}
	case "down":
		if _, err := riverMigrator.Migrate(ctx, rivermigrate.DirectionDown, nil); err != nil {
			log.Fatalf("river migrate down: %v", err)
		}
	}

	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()

	goose.SetDialect("postgres")
	switch direction {
	case "up":
		if err := goose.Up(db, "internal/db/migrations"); err != nil {
			log.Fatalf("goose up: %v", err)
		}
		fmt.Println("migrations applied")
	case "down":
		if err := goose.Down(db, "internal/db/migrations"); err != nil {
			log.Fatalf("goose down: %v", err)
		}
		fmt.Println("migration rolled back")
	case "status":
		if err := goose.Status(db, "internal/db/migrations"); err != nil {
			log.Fatalf("goose status: %v", err)
		}
	default:
		log.Fatalf("unknown direction: %s", direction)
	}
}
```

- [ ] **Étape 3 : Vérifier que ça compile**

```bash
cd apps/keyrigme-server && go build ./cmd/migrate
```

Résultat attendu : binaire créé, aucune erreur.

- [ ] **Étape 4 : Appliquer les migrations (PostgreSQL requis)**

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/keyrigme?sslmode=disable" \
  go run ./cmd/migrate up
```

Résultat attendu : `migrations applied`

- [ ] **Étape 5 : Commit**

```bash
git add apps/keyrigme-server/internal/db/migrations/ apps/keyrigme-server/cmd/migrate/
git commit -m "feat(keyrigme-server): DB migrations and migrate command"
```

---

## Task 3 : sqlc queries + génération du code Go

**Files:**
- Create: `apps/keyrigme-server/internal/db/query/questions.sql`
- Create: `apps/keyrigme-server/internal/db/query/rooms.sql`
- Generated: `apps/keyrigme-server/internal/db/sqlc/` (ne pas éditer manuellement)

- [ ] **Étape 1 : Créer `questions.sql`**

```sql
-- name: GetRandomQuestions :many
SELECT * FROM questions
WHERE categories && @categories::text[]
ORDER BY random()
LIMIT @lim;

-- name: CountQuestionsByCategory :many
SELECT unnest(categories) AS category, COUNT(*)::int AS count
FROM questions
GROUP BY category;

-- name: InsertQuestion :one
INSERT INTO questions (
  title, points, timer_ms, categories, type,
  answer, files, media_type, order_items, answer_items
) VALUES (
  @title, @points, @timer_ms, @categories, @type,
  @answer, @files, @media_type, @order_items, @answer_items
)
RETURNING *;

-- name: DeleteAllQuestions :exec
DELETE FROM questions;
```

- [ ] **Étape 2 : Créer `rooms.sql`**

```sql
-- name: InsertRoom :one
INSERT INTO rooms (code, categories, owner, players, no_of_players, no_of_rounds)
VALUES (@code, @categories, @owner, @players, @no_of_players, @no_of_rounds)
RETURNING *;

-- name: GetRoomByCode :one
SELECT * FROM rooms WHERE code = @code AND status = 'Initial';

-- name: GetRoomByID :one
SELECT * FROM rooms WHERE id = @id;

-- name: AddPlayerToRoom :one
UPDATE rooms
SET players    = players || @player::jsonb,
    updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: UpdateRoomConfig :one
UPDATE rooms
SET no_of_players = @no_of_players,
    no_of_rounds  = @no_of_rounds,
    categories    = @categories,
    updated_at    = NOW()
WHERE id = @id AND status = 'Initial'
RETURNING *;

-- name: StartRoom :one
UPDATE rooms
SET status = 'Started', updated_at = NOW()
WHERE id = @id AND status = 'Initial'
RETURNING *;

-- name: InitBonus :one
UPDATE rooms
SET bonus = @bonus, updated_at = NOW()
WHERE id = @id AND status = 'Started'
RETURNING *;

-- name: AddQuestionsToRoom :one
UPDATE rooms
SET questions   = @questions,
    answers     = @answers,
    updated_at  = NOW()
WHERE id = @id
RETURNING *;

-- name: SetUserAnswer :one
UPDATE rooms
SET answers = jsonb_set(
      answers,
      ARRAY[@question_id::text, @username::text],
      jsonb_build_object('response', @response::text, 'point', 0)
    ),
    updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: GetRoomForOwner :one
SELECT * FROM rooms WHERE id = @id AND status = @status;

-- name: SetPointsAndEndRoom :one
UPDATE rooms
SET answers    = @answers,
    status     = 'Ended',
    updated_at = NOW(),
    version    = version + 1
WHERE id = @id AND version = @version
RETURNING *;

-- name: PassRoomToReview :one
UPDATE rooms
SET status = 'Review', updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: RemovePlayerFromRoom :one
UPDATE rooms
SET players = (
      SELECT jsonb_agg(p)
      FROM jsonb_array_elements(players) AS p
      WHERE p->>'username' != @username::text
    ),
    updated_at = NOW()
WHERE id = @id
RETURNING *;
```

- [ ] **Étape 3 : Générer le code Go**

```bash
cd apps/keyrigme-server && sqlc generate
```

Résultat attendu : `internal/db/sqlc/` contient `db.go`, `models.go`, `questions.sql.go`, `rooms.sql.go`.

- [ ] **Étape 4 : Vérifier la compilation**

```bash
cd apps/keyrigme-server && go build ./internal/db/...
```

- [ ] **Étape 5 : Commit**

```bash
git add apps/keyrigme-server/internal/db/
git commit -m "feat(keyrigme-server): sqlc queries and generated DB layer"
```

---

## Task 4 : Interface RoomNotifier + Hub WebSocket

**Files:**
- Create: `apps/keyrigme-server/internal/service/notifier.go`
- Create: `apps/keyrigme-server/internal/hub/client.go`
- Create: `apps/keyrigme-server/internal/hub/hub.go`
- Create: `apps/keyrigme-server/internal/hub/hub_test.go`

- [ ] **Étape 1 : Créer `notifier.go`**

```go
// apps/keyrigme-server/internal/service/notifier.go
package service

// RoomNotifier envoie des messages WebSocket.
// Le hub concret implémente cette interface.
type RoomNotifier interface {
	NotifyRoom(roomID string, event string, payload any)
	NotifySocket(socketID string, event string, payload any)
	IsOwner(roomID, socketID string) bool
	SetOwner(roomID, socketID string)
	JoinRoom(roomID, socketID string)
	LeaveRoom(roomID, socketID string)
}
```

- [ ] **Étape 2 : Écrire les tests du hub (failing)**

```go
// apps/keyrigme-server/internal/hub/hub_test.go
package hub_test

import (
	"sync"
	"testing"
	"time"

	"keyrigme-server/internal/hub"
)

func TestHub_NotifySocket_DeliversMessage(t *testing.T) {
	h := hub.New()
	received := make(chan []byte, 1)
	h.RegisterMock("conn-1", func(data []byte) { received <- data })

	h.NotifySocket("conn-1", "testEvent", map[string]string{"key": "val"})

	select {
	case msg := <-received:
		if len(msg) == 0 {
			t.Fatal("expected non-empty message")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout: message not delivered")
	}
}

func TestHub_NotifyRoom_DeliversToAllMembers(t *testing.T) {
	h := hub.New()
	var mu sync.Mutex
	var msgs [][]byte
	for _, id := range []string{"conn-1", "conn-2"} {
		id := id
		h.RegisterMock(id, func(data []byte) {
			mu.Lock(); msgs = append(msgs, data); mu.Unlock()
		})
		h.JoinRoom("room-1", id)
	}

	h.NotifyRoom("room-1", "ping", nil)
	time.Sleep(50 * time.Millisecond)

	mu.Lock(); defer mu.Unlock()
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
}

func TestHub_IsOwner(t *testing.T) {
	h := hub.New()
	h.SetOwner("room-1", "conn-owner")

	if !h.IsOwner("room-1", "conn-owner") {
		t.Fatal("expected conn-owner to be owner")
	}
	if h.IsOwner("room-1", "conn-other") {
		t.Fatal("expected conn-other NOT to be owner")
	}
}
```

- [ ] **Étape 3 : Vérifier que les tests échouent**

```bash
cd apps/keyrigme-server && go test ./internal/hub/...
```

Résultat attendu : erreur de compilation.

- [ ] **Étape 4 : Créer `client.go`**

```go
// apps/keyrigme-server/internal/hub/client.go
package hub

import (
	"context"
	"log/slog"

	"nhooyr.io/websocket"
)

// Client représente une connexion WebSocket active.
type Client struct {
	id   string
	conn *websocket.Conn
	send chan []byte
}

// WritePump lit le canal send et écrit sur la connexion WebSocket.
func (c *Client) WritePump(ctx context.Context) {
	defer c.conn.Close(websocket.StatusNormalClosure, "")
	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			if err := c.conn.Write(ctx, websocket.MessageText, msg); err != nil {
				slog.Error("ws write", "connID", c.id, "err", err)
				return
			}
		case <-ctx.Done():
			return
		}
	}
}
```

- [ ] **Étape 5 : Créer `hub.go`**

```go
// apps/keyrigme-server/internal/hub/hub.go
package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"nhooyr.io/websocket"
)

// Hub gère les connexions WebSocket actives, les rooms et les owners.
// Implémente service.RoomNotifier.
type Hub struct {
	mu          sync.RWMutex
	clients     map[string]*Client         // connID → client
	rooms       map[string]map[string]bool // roomID → set de connIDs
	owners      map[string]string          // roomID → connID du owner
	mockSenders map[string]func([]byte)    // pour les tests uniquement
}

func New() *Hub {
	return &Hub{
		clients:     make(map[string]*Client),
		rooms:       make(map[string]map[string]bool),
		owners:      make(map[string]string),
		mockSenders: make(map[string]func([]byte)),
	}
}

// RegisterMock enregistre une fonction d'envoi fictive (tests uniquement).
func (h *Hub) RegisterMock(connID string, fn func([]byte)) {
	h.mu.Lock(); defer h.mu.Unlock()
	h.mockSenders[connID] = fn
}

// Register enregistre un client WebSocket réel et retourne son connID.
func (h *Hub) Register(ctx context.Context, conn *websocket.Conn) string {
	connID := uuid.New().String()
	client := &Client{id: connID, conn: conn, send: make(chan []byte, 256)}
	h.mu.Lock()
	h.clients[connID] = client
	h.mu.Unlock()
	go client.WritePump(ctx)
	return connID
}

// Unregister retire un client de toutes ses rooms.
func (h *Hub) Unregister(connID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if c, ok := h.clients[connID]; ok {
		close(c.send)
		delete(h.clients, connID)
	}
	delete(h.mockSenders, connID)
	for roomID, members := range h.rooms {
		delete(members, connID)
		if len(members) == 0 {
			delete(h.rooms, roomID)
			delete(h.owners, roomID)
		}
	}
}

func (h *Hub) SetOwner(roomID, connID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	h.owners[roomID] = connID
}

func (h *Hub) IsOwner(roomID, connID string) bool {
	h.mu.RLock(); defer h.mu.RUnlock()
	return h.owners[roomID] == connID
}

func (h *Hub) JoinRoom(roomID, connID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[string]bool)
	}
	h.rooms[roomID][connID] = true
}

func (h *Hub) LeaveRoom(roomID, connID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if m := h.rooms[roomID]; m != nil {
		delete(m, connID)
	}
}

func (h *Hub) NotifyRoom(roomID, event string, payload any) {
	h.mu.RLock()
	members := make([]string, 0, len(h.rooms[roomID]))
	for id := range h.rooms[roomID] {
		members = append(members, id)
	}
	h.mu.RUnlock()
	for _, connID := range members {
		h.sendTo(connID, event, payload)
	}
}

func (h *Hub) NotifySocket(connID, event string, payload any) {
	h.sendTo(connID, event, payload)
}

func (h *Hub) sendTo(connID, event string, payload any) {
	data, err := json.Marshal(map[string]any{"event": event, "data": payload})
	if err != nil {
		slog.Error("marshal notify", "err", err); return
	}
	h.mu.RLock()
	client := h.clients[connID]
	mock := h.mockSenders[connID]
	h.mu.RUnlock()

	switch {
	case client != nil:
		select {
		case client.send <- data:
		default:
			slog.Warn("client buffer full, dropping", "connID", connID)
		}
	case mock != nil:
		mock(data)
	}
}
```

- [ ] **Étape 6 : Lancer les tests**

```bash
cd apps/keyrigme-server && go test ./internal/hub/...
```

Résultat attendu : `PASS`

- [ ] **Étape 7 : Commit**

```bash
git add apps/keyrigme-server/internal/service/notifier.go apps/keyrigme-server/internal/hub/
git commit -m "feat(keyrigme-server): RoomNotifier interface and WebSocket hub"
```

---

## Task 5 : QuestionService

**Files:**
- Create: `apps/keyrigme-server/internal/service/question.go`
- Create: `apps/keyrigme-server/internal/service/question_test.go`
- Create: `apps/keyrigme-server/internal/service/testhelpers_test.go`

- [ ] **Étape 1 : Créer les helpers de test**

```go
// apps/keyrigme-server/internal/service/testhelpers_test.go
package service_test

import (
	"context"
	"sync"

	dbsqlc "keyrigme-server/internal/db/sqlc"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// mockQuerier implémente dbsqlc.Querier pour les tests.
type mockQuerier struct {
	dbsqlc.Querier
	countFn         func(ctx context.Context) ([]dbsqlc.CountQuestionsByCategoryRow, error)
	randomFn        func(ctx context.Context, arg dbsqlc.GetRandomQuestionsParams) ([]dbsqlc.Question, error)
	insertQuestionFn func(ctx context.Context, arg dbsqlc.InsertQuestionParams) (dbsqlc.Question, error)
	deleteFn        func(ctx context.Context) error
	insertRoomFn    func(ctx context.Context, arg dbsqlc.InsertRoomParams) (dbsqlc.Room, error)
	getRoomByCodeFn func(ctx context.Context, code string) (dbsqlc.Room, error)
	getRoomByIDFn   func(ctx context.Context, id uuid.UUID) (dbsqlc.Room, error)
}

func (m *mockQuerier) CountQuestionsByCategory(ctx context.Context) ([]dbsqlc.CountQuestionsByCategoryRow, error) {
	return m.countFn(ctx)
}
func (m *mockQuerier) GetRandomQuestions(ctx context.Context, arg dbsqlc.GetRandomQuestionsParams) ([]dbsqlc.Question, error) {
	return m.randomFn(ctx, arg)
}
func (m *mockQuerier) InsertQuestion(ctx context.Context, arg dbsqlc.InsertQuestionParams) (dbsqlc.Question, error) {
	return m.insertQuestionFn(ctx, arg)
}
func (m *mockQuerier) DeleteAllQuestions(ctx context.Context) error {
	return m.deleteFn(ctx)
}
func (m *mockQuerier) InsertRoom(ctx context.Context, arg dbsqlc.InsertRoomParams) (dbsqlc.Room, error) {
	return m.insertRoomFn(ctx, arg)
}
func (m *mockQuerier) GetRoomByCode(ctx context.Context, code string) (dbsqlc.Room, error) {
	return m.getRoomByCodeFn(ctx, code)
}
func (m *mockQuerier) GetRoomByID(ctx context.Context, id uuid.UUID) (dbsqlc.Room, error) {
	return m.getRoomByIDFn(ctx, id)
}
func (m *mockQuerier) AddPlayerToRoom(ctx context.Context, arg dbsqlc.AddPlayerToRoomParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}

// mockNotifier implémente service.RoomNotifier pour les tests.
type mockNotifier struct {
	mu       sync.Mutex
	roomMsgs []notifyCall
	sockMsgs []notifyCall
	owners   map[string]string
}
type notifyCall struct{ target, event string; payload any }

func newMockNotifier() *mockNotifier {
	return &mockNotifier{owners: make(map[string]string)}
}
func (m *mockNotifier) NotifyRoom(roomID, event string, payload any) {
	m.mu.Lock(); defer m.mu.Unlock()
	m.roomMsgs = append(m.roomMsgs, notifyCall{roomID, event, payload})
}
func (m *mockNotifier) NotifySocket(socketID, event string, payload any) {
	m.mu.Lock(); defer m.mu.Unlock()
	m.sockMsgs = append(m.sockMsgs, notifyCall{socketID, event, payload})
}
func (m *mockNotifier) IsOwner(roomID, socketID string) bool {
	m.mu.Lock(); defer m.mu.Unlock()
	return m.owners[roomID] == socketID
}
func (m *mockNotifier) SetOwner(roomID, socketID string) {
	m.mu.Lock(); defer m.mu.Unlock()
	m.owners[roomID] = socketID
}
func (m *mockNotifier) JoinRoom(_, _ string)  {}
func (m *mockNotifier) LeaveRoom(_, _ string) {}

func makeQuestion(id, title string, categories []string) dbsqlc.Question {
	uid, _ := uuid.Parse(id)
	return dbsqlc.Question{
		ID: uid, Title: title, Points: 3, TimerMs: 10000,
		Categories: categories, Type: "Media",
		Answer:    pgtype.Text{String: "42", Valid: true},
		MediaType: pgtype.Text{String: "Image", Valid: true},
		Files:     []string{},
		CreatedAt: pgtype.Timestamptz{Valid: true},
		UpdatedAt: pgtype.Timestamptz{Valid: true},
	}
}

func makeRoom(id, code, status string) dbsqlc.Room {
	uid, _ := uuid.Parse(id)
	return dbsqlc.Room{
		ID: uid, Code: code, Status: status,
		NoOfPlayers: 10, NoOfRounds:  5,
		Categories: []string{"OLD_TESTIMONY"},
		Owner:      []byte(`{"username":"alice","avatar":"🦊"}`),
		Players:    []byte(`[{"username":"alice","avatar":"🦊"}]`),
		Answers:    []byte(`{}`), Bonus: []byte(`{}`),
		Version: 1,
	}
}
```

- [ ] **Étape 2 : Écrire les tests (failing)**

```go
// apps/keyrigme-server/internal/service/question_test.go
package service_test

import (
	"context"
	"errors"
	"testing"

	dbsqlc "keyrigme-server/internal/db/sqlc"
	"keyrigme-server/internal/service"
)

func TestQuestionService_CountByCategory_ReturnsRows(t *testing.T) {
	q := &mockQuerier{
		countFn: func(_ context.Context) ([]dbsqlc.CountQuestionsByCategoryRow, error) {
			return []dbsqlc.CountQuestionsByCategoryRow{
				{Category: "OLD_TESTIMONY", Count: 3},
			}, nil
		},
	}
	svc := service.NewQuestionService(q)
	rows, err := svc.CountByCategory(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 1 || rows[0].Category != "OLD_TESTIMONY" {
		t.Fatalf("unexpected rows: %+v", rows)
	}
}

func TestQuestionService_CountByCategory_PropagatesError(t *testing.T) {
	q := &mockQuerier{
		countFn: func(_ context.Context) ([]dbsqlc.CountQuestionsByCategoryRow, error) {
			return nil, errors.New("db down")
		},
	}
	svc := service.NewQuestionService(q)
	_, err := svc.CountByCategory(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestQuestionService_GetRandom_ReturnsQuestions(t *testing.T) {
	q := &mockQuerier{
		randomFn: func(_ context.Context, _ dbsqlc.GetRandomQuestionsParams) ([]dbsqlc.Question, error) {
			return []dbsqlc.Question{
				makeQuestion("00000000-0000-0000-0000-000000000001", "Q1", []string{"OLD_TESTIMONY"}),
			}, nil
		},
	}
	svc := service.NewQuestionService(q)
	questions, err := svc.GetRandom(context.Background(), 1, []string{"OLD_TESTIMONY"})
	if err != nil || len(questions) != 1 {
		t.Fatalf("unexpected: err=%v len=%d", err, len(questions))
	}
}
```

- [ ] **Étape 3 : Vérifier que les tests échouent**

```bash
cd apps/keyrigme-server && go test ./internal/service/... -run TestQuestion
```

Résultat attendu : erreur de compilation (`service.NewQuestionService` non défini).

- [ ] **Étape 4 : Créer `question.go`**

```go
// apps/keyrigme-server/internal/service/question.go
package service

import (
	"context"
	"encoding/json"

	dbsqlc "keyrigme-server/internal/db/sqlc"

	"github.com/jackc/pgx/v5/pgtype"
)

type QuestionService struct{ q dbsqlc.Querier }

func NewQuestionService(q dbsqlc.Querier) *QuestionService {
	return &QuestionService{q: q}
}

type CategoryCount struct {
	Category string `json:"id"`
	Count    int32  `json:"count"`
}

func (s *QuestionService) CountByCategory(ctx context.Context) ([]CategoryCount, error) {
	rows, err := s.q.CountQuestionsByCategory(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]CategoryCount, len(rows))
	for i, r := range rows {
		result[i] = CategoryCount{Category: r.Category, Count: r.Count}
	}
	return result, nil
}

func (s *QuestionService) GetRandom(ctx context.Context, n int32, categories []string) ([]dbsqlc.Question, error) {
	return s.q.GetRandomQuestions(ctx, dbsqlc.GetRandomQuestionsParams{
		Categories: categories,
		Lim:        n,
	})
}

func (s *QuestionService) Seed(ctx context.Context) (int, error) {
	return s.insertMany(ctx, seedData())
}

func (s *QuestionService) Reset(ctx context.Context) (int, error) {
	if err := s.q.DeleteAllQuestions(ctx); err != nil {
		return 0, err
	}
	return s.insertMany(ctx, seedData())
}

func (s *QuestionService) insertMany(ctx context.Context, params []dbsqlc.InsertQuestionParams) (int, error) {
	count := 0
	for _, p := range params {
		if _, err := s.q.InsertQuestion(ctx, p); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func seedData() []dbsqlc.InsertQuestionParams {
	img := pgtype.Text{String: "Image", Valid: true}
	noOrder := json.RawMessage("[]")
	media := func(title, answer string, points, timer int32, cats []string) dbsqlc.InsertQuestionParams {
		return dbsqlc.InsertQuestionParams{
			Title: title, Points: points, TimerMs: timer,
			Categories: cats, Type: "Media",
			Answer: pgtype.Text{String: answer, Valid: true}, MediaType: img,
			Files: []string{}, OrderItems: noOrder, AnswerItems: []string{},
		}
	}
	return []dbsqlc.InsertQuestionParams{
		media("Dans quelle ville Jésus est-il né ?", "Bethléem", 1, 10000, []string{"NEW_TESTIMONY"}),
		media("Combien d'apôtres Jésus a-t-il choisis ?", "12", 2, 10000, []string{"NEW_TESTIMONY"}),
		media("Quel père de l'Église a écrit les Confessions ?", "Saint Augustin", 4, 20000, []string{"CHURCH_FATHERS"}),
		media("Qui est l'auteur de la Somme Théologique ?", "Saint Thomas d'Aquin", 4, 20000, []string{"CHURCH_FATHERS"}),
		media("En quelle année a eu lieu le Grand Schisme d'Orient ?", "1054", 5, 20000, []string{"HISTORY"}),
		media("Quel concile a défini le dogme de l'Immaculée Conception ?", "Pape Pie IX en 1854", 5, 25000, []string{"HISTORY"}),
		media("Quel saint est le patron de la France ?", "Saint Denis", 3, 15000, []string{"SAINT"}),
		media("Combien de sacrements compte l'Église catholique ?", "7", 2, 10000, []string{"TRADITION"}),
		media("Quel est le premier sacrement de l'initiation chrétienne ?", "Le baptême", 2, 10000, []string{"TRADITION"}),
		media("Combien de livres compte la Bible catholique ?", "73", 4, 20000, []string{"OLD_TESTIMONY", "NEW_TESTIMONY"}),
	}
}
```

- [ ] **Étape 5 : Lancer les tests**

```bash
cd apps/keyrigme-server && go test ./internal/service/... -run TestQuestion
```

Résultat attendu : `PASS`

- [ ] **Étape 6 : Commit**

```bash
git add apps/keyrigme-server/internal/service/
git commit -m "feat(keyrigme-server): QuestionService with TDD"
```

---

## Task 6 : River workers

**Files:**
- Create: `apps/keyrigme-server/internal/service/args.go`
- Create: `apps/keyrigme-server/internal/worker/send_question.go`
- Create: `apps/keyrigme-server/internal/worker/end_quizz.go`
- Create: `apps/keyrigme-server/internal/worker/workers_test.go`

- [ ] **Étape 1 : Créer `args.go` (types partagés)**

```go
// apps/keyrigme-server/internal/service/args.go
package service

import dbsqlc "keyrigme-server/internal/db/sqlc"

// SendQuestionArgs est le payload du River job qui envoie une question.
type SendQuestionArgs struct {
	RoomID   string          `json:"roomId"`
	Question dbsqlc.Question `json:"question"`
}

func (SendQuestionArgs) Kind() string { return "send_question" }

// EndQuizzArgs est le payload du River job qui termine la partie.
type EndQuizzArgs struct {
	RoomID string `json:"roomId"`
}

func (EndQuizzArgs) Kind() string { return "end_quizz" }
```

- [ ] **Étape 2 : Écrire les tests (failing)**

```go
// apps/keyrigme-server/internal/worker/workers_test.go
package worker_test

import (
	"context"
	"testing"

	dbsqlc "keyrigme-server/internal/db/sqlc"
	"keyrigme-server/internal/service"
	"keyrigme-server/internal/worker"

	"github.com/google/uuid"
	"github.com/riverqueue/river"
)

type mockNotifier struct {
	roomCalls []string
}
func (m *mockNotifier) NotifyRoom(roomID, event string, _ any)    { m.roomCalls = append(m.roomCalls, event) }
func (m *mockNotifier) NotifySocket(_, _ string, _ any)           {}
func (m *mockNotifier) IsOwner(_, _ string) bool                  { return false }
func (m *mockNotifier) SetOwner(_, _ string)                      {}
func (m *mockNotifier) JoinRoom(_, _ string)                      {}
func (m *mockNotifier) LeaveRoom(_, _ string)                     {}

func TestSendQuestionWorker_NotifiesRoom(t *testing.T) {
	n := &mockNotifier{}
	w := worker.NewSendQuestionWorker(n)

	job := &river.Job[service.SendQuestionArgs]{
		Args: service.SendQuestionArgs{
			RoomID:   "room-123",
			Question: dbsqlc.Question{ID: uuid.New(), Title: "Test ?"},
		},
	}
	if err := w.Work(context.Background(), job); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(n.roomCalls) != 1 || n.roomCalls[0] != "newRoundData" {
		t.Fatalf("expected newRoundData event, got %v", n.roomCalls)
	}
}

func TestEndQuizzWorker_NotifiesRoom(t *testing.T) {
	n := &mockNotifier{}
	w := worker.NewEndQuizzWorker(n)

	job := &river.Job[service.EndQuizzArgs]{
		Args: service.EndQuizzArgs{RoomID: "room-123"},
	}
	if err := w.Work(context.Background(), job); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(n.roomCalls) != 1 || n.roomCalls[0] != "endQuizz" {
		t.Fatalf("expected endQuizz event, got %v", n.roomCalls)
	}
}
```

- [ ] **Étape 3 : Vérifier que les tests échouent**

```bash
cd apps/keyrigme-server && go test ./internal/worker/...
```

Résultat attendu : erreur de compilation.

- [ ] **Étape 4 : Créer `send_question.go`**

```go
// apps/keyrigme-server/internal/worker/send_question.go
package worker

import (
	"context"

	"keyrigme-server/internal/service"

	"github.com/riverqueue/river"
)

type SendQuestionWorker struct {
	river.WorkerDefaults[service.SendQuestionArgs]
	notifier service.RoomNotifier
}

func NewSendQuestionWorker(n service.RoomNotifier) *SendQuestionWorker {
	return &SendQuestionWorker{notifier: n}
}

func (w *SendQuestionWorker) Work(ctx context.Context, job *river.Job[service.SendQuestionArgs]) error {
	w.notifier.NotifyRoom(job.Args.RoomID, "newRoundData", job.Args.Question)
	return nil
}
```

- [ ] **Étape 5 : Créer `end_quizz.go`**

```go
// apps/keyrigme-server/internal/worker/end_quizz.go
package worker

import (
	"context"
	"log/slog"

	"keyrigme-server/internal/service"

	"github.com/riverqueue/river"
)

type EndQuizzWorker struct {
	river.WorkerDefaults[service.EndQuizzArgs]
	notifier    service.RoomNotifier
	roomService *service.RoomService
}

func NewEndQuizzWorker(n service.RoomNotifier) *EndQuizzWorker {
	return &EndQuizzWorker{notifier: n}
}

// SetRoomService injecte le RoomService (pour éviter le cycle d'import).
func (w *EndQuizzWorker) SetRoomService(rs *service.RoomService) {
	w.roomService = rs
}

func (w *EndQuizzWorker) Work(ctx context.Context, job *river.Job[service.EndQuizzArgs]) error {
	if w.roomService != nil {
		if err := w.roomService.PassToReview(ctx, job.Args.RoomID); err != nil {
			slog.Error("passToReview failed", "roomID", job.Args.RoomID, "err", err)
		}
	}
	w.notifier.NotifyRoom(job.Args.RoomID, "endQuizz", nil)
	return nil
}
```

- [ ] **Étape 6 : Lancer les tests**

```bash
cd apps/keyrigme-server && go test ./internal/worker/...
```

Résultat attendu : `PASS`

- [ ] **Étape 7 : Commit**

```bash
git add apps/keyrigme-server/internal/service/args.go apps/keyrigme-server/internal/worker/
git commit -m "feat(keyrigme-server): River workers SendQuestion and EndQuizz"
```

---

## Task 7 : RoomService

**Files:**
- Create: `apps/keyrigme-server/internal/service/room.go`
- Create: `apps/keyrigme-server/internal/service/room_test.go`

- [ ] **Étape 1 : Écrire les tests (failing)**

```go
// apps/keyrigme-server/internal/service/room_test.go
package service_test

import (
	"context"
	"encoding/json"
	"testing"

	dbsqlc "keyrigme-server/internal/db/sqlc"
	"keyrigme-server/internal/service"

	"github.com/google/uuid"
)

func TestRoomService_Create_NotifiesSocket(t *testing.T) {
	room := makeRoom("00000000-0000-0000-0000-000000000001", "abc-code", "Initial")
	q := &mockQuerier{
		insertRoomFn: func(_ context.Context, _ dbsqlc.InsertRoomParams) (dbsqlc.Room, error) {
			return room, nil
		},
	}
	n := newMockNotifier()
	svc := service.NewRoomService(q, n, nil)

	if err := svc.Create(context.Background(), "conn-1", "alice", "🦊"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	n.mu.Lock(); defer n.mu.Unlock()
	if len(n.sockMsgs) == 0 || n.sockMsgs[0].event != "roomCreated" {
		t.Fatalf("expected roomCreated notification, got %+v", n.sockMsgs)
	}
}

func TestRoomService_Join_RejectsFullRoom(t *testing.T) {
	room := makeRoom("00000000-0000-0000-0000-000000000001", "abc", "Initial")
	room.NoOfPlayers = 1
	q := &mockQuerier{
		getRoomByCodeFn: func(_ context.Context, _ string) (dbsqlc.Room, error) {
			return room, nil
		},
	}
	svc := service.NewRoomService(q, newMockNotifier(), nil)
	if err := svc.Join(context.Background(), "conn-2", "abc", "bob", "🐺"); err == nil {
		t.Fatal("expected error for full room")
	}
}

func TestRoomService_UpdateConfig_RejectsNonOwner(t *testing.T) {
	n := newMockNotifier()
	n.owners["room-1"] = "conn-owner"
	svc := service.NewRoomService(&mockQuerier{}, n, nil)

	err := svc.UpdateConfig(context.Background(), "conn-other", "room-1", 5, 5, []string{"OLD_TESTIMONY"})
	if err == nil {
		t.Fatal("expected ErrNotOwner")
	}
}

func TestRoomService_SetAnswer_UpdatesDB(t *testing.T) {
	called := false
	q := &mockQuerier{
		setUserAnswerFn: func(_ context.Context, arg dbsqlc.SetUserAnswerParams) (dbsqlc.Room, error) {
			called = true
			if arg.Username != "alice" || arg.Response != "Bethléem" {
				t.Errorf("unexpected arg: %+v", arg)
			}
			return makeRoom("00000000-0000-0000-0000-000000000001", "abc", "Started"), nil
		},
	}
	svc := service.NewRoomService(q, newMockNotifier(), nil)
	id := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	err := svc.SetAnswer(context.Background(), "conn-1", id.String(), uuid.New().String(), "alice", "Bethléem")
	if err != nil || !called {
		t.Fatalf("err=%v called=%v", err, called)
	}
}
```

Ajouter dans `testhelpers_test.go` les méthodes manquantes du mockQuerier :

```go
// à ajouter dans testhelpers_test.go, dans la struct mockQuerier
setUserAnswerFn func(ctx context.Context, arg dbsqlc.SetUserAnswerParams) (dbsqlc.Room, error)

// et la méthode :
func (m *mockQuerier) SetUserAnswer(ctx context.Context, arg dbsqlc.SetUserAnswerParams) (dbsqlc.Room, error) {
	if m.setUserAnswerFn != nil {
		return m.setUserAnswerFn(ctx, arg)
	}
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) UpdateRoomConfig(ctx context.Context, arg dbsqlc.UpdateRoomConfigParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) StartRoom(ctx context.Context, id uuid.UUID) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) InitBonus(ctx context.Context, arg dbsqlc.InitBonusParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) AddQuestionsToRoom(ctx context.Context, arg dbsqlc.AddQuestionsToRoomParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) RemovePlayerFromRoom(ctx context.Context, arg dbsqlc.RemovePlayerFromRoomParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) PassRoomToReview(ctx context.Context, id uuid.UUID) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) SetPointsAndEndRoom(ctx context.Context, arg dbsqlc.SetPointsAndEndRoomParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) GetRoomForOwner(ctx context.Context, arg dbsqlc.GetRoomForOwnerParams) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
func (m *mockQuerier) GetRoomWithQuestions(ctx context.Context, id uuid.UUID) (dbsqlc.Room, error) {
	return dbsqlc.Room{}, nil
}
```

- [ ] **Étape 2 : Vérifier que les tests échouent**

```bash
cd apps/keyrigme-server && go test ./internal/service/... -run TestRoom
```

Résultat attendu : erreur de compilation.

- [ ] **Étape 3 : Créer `room.go`**

```go
// apps/keyrigme-server/internal/service/room.go
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	dbsqlc "keyrigme-server/internal/db/sqlc"

	"github.com/google/uuid"
	"github.com/riverqueue/river"
)

var (
	ErrRoomFull        = errors.New("room is full")
	ErrRoomNotFound    = errors.New("room not found")
	ErrGameStarted     = errors.New("game has already started")
	ErrNotOwner        = errors.New("unauthorized: not the room owner")
	ErrVersionConflict = errors.New("concurrent update conflict, retry")
)

type RoomService struct {
	q        dbsqlc.Querier
	notifier RoomNotifier
	river    *river.Client
}

func NewRoomService(q dbsqlc.Querier, notifier RoomNotifier, riverClient *river.Client) *RoomService {
	return &RoomService{q: q, notifier: notifier, river: riverClient}
}

type playerJSON struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

func (s *RoomService) Create(ctx context.Context, connID, username, avatar string) error {
	owner, _ := json.Marshal(playerJSON{Username: username, Avatar: avatar})
	players, _ := json.Marshal([]playerJSON{{Username: username, Avatar: avatar}})

	room, err := s.q.InsertRoom(ctx, dbsqlc.InsertRoomParams{
		Code:        uuid.New().String(),
		Categories:  []string{"OLD_TESTIMONY", "NEW_TESTIMONY", "CHURCH_FATHERS", "TRADITION", "HISTORY", "SAINT"},
		Owner:       json.RawMessage(owner),
		Players:     json.RawMessage(players),
		NoOfPlayers: 10,
		NoOfRounds:  5,
	})
	if err != nil {
		return fmt.Errorf("create room: %w", err)
	}
	roomID := room.ID.String()
	s.notifier.SetOwner(roomID, connID)
	s.notifier.JoinRoom(roomID, connID)
	s.notifier.NotifySocket(connID, "roomCreated", room)
	return nil
}

func (s *RoomService) Join(ctx context.Context, connID, code, username, avatar string) error {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return ErrRoomNotFound
	}
	if room.Status != "Initial" {
		return ErrGameStarted
	}
	var players []playerJSON
	json.Unmarshal(room.Players, &players)
	if int32(len(players)) >= room.NoOfPlayers {
		return ErrRoomFull
	}
	newPlayer, _ := json.Marshal(playerJSON{Username: username, Avatar: avatar})
	updated, err := s.q.AddPlayerToRoom(ctx, dbsqlc.AddPlayerToRoomParams{
		ID:     room.ID,
		Player: json.RawMessage(newPlayer),
	})
	if err != nil {
		return fmt.Errorf("add player: %w", err)
	}
	roomID := room.ID.String()
	s.notifier.JoinRoom(roomID, connID)
	s.notifier.NotifyRoom(roomID, "addPlayer", playerJSON{Username: username, Avatar: avatar})
	s.notifier.NotifySocket(connID, "roomJoined", updated)
	return nil
}

func (s *RoomService) UpdateConfig(ctx context.Context, connID, roomID string, noOfPlayers, noOfRounds int32, categories []string) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	updated, err := s.q.UpdateRoomConfig(ctx, dbsqlc.UpdateRoomConfigParams{
		ID: uid, NoOfPlayers: noOfPlayers, NoOfRounds: noOfRounds, Categories: categories,
	})
	if err != nil {
		return err
	}
	s.notifier.NotifyRoom(roomID, "roomConfigUpdated", updated)
	return nil
}

func (s *RoomService) Start(ctx context.Context, connID, roomID string, questions []dbsqlc.Question) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	room, err := s.q.StartRoom(ctx, uid)
	if err != nil {
		return fmt.Errorf("start room: %w", err)
	}

	var players []playerJSON
	json.Unmarshal(room.Players, &players)

	bonus := make(map[string]map[string]int)
	for _, p := range players {
		bonus[p.Username] = map[string]int{"point": 0}
	}
	questionIDs := make([]uuid.UUID, len(questions))
	answers := make(map[string]map[string]any)
	for i, q := range questions {
		questionIDs[i] = q.ID
		answers[q.ID.String()] = make(map[string]any)
		for _, p := range players {
			answers[q.ID.String()][p.Username] = map[string]any{"response": "", "point": 0}
		}
	}
	bonusJSON, _ := json.Marshal(bonus)
	answersJSON, _ := json.Marshal(answers)

	if _, err := s.q.InitBonus(ctx, dbsqlc.InitBonusParams{ID: uid, Bonus: json.RawMessage(bonusJSON)}); err != nil {
		return err
	}
	if _, err := s.q.AddQuestionsToRoom(ctx, dbsqlc.AddQuestionsToRoomParams{
		ID: uid, Questions: questionIDs, Answers: json.RawMessage(answersJSON),
	}); err != nil {
		return err
	}

	s.notifier.NotifyRoom(roomID, "quizzStarted", nil)

	if s.river != nil {
		var delay time.Duration
		for _, q := range questions {
			qCopy := q
			if _, err := s.river.Insert(ctx, SendQuestionArgs{RoomID: roomID, Question: qCopy}, &river.InsertOpts{
				ScheduledAt: time.Now().Add(delay),
			}); err != nil {
				return fmt.Errorf("schedule question: %w", err)
			}
			delay += time.Duration(q.TimerMs) * time.Millisecond
		}
		if _, err := s.river.Insert(ctx, EndQuizzArgs{RoomID: roomID}, &river.InsertOpts{
			ScheduledAt: time.Now().Add(delay),
		}); err != nil {
			return fmt.Errorf("schedule end_quizz: %w", err)
		}
	}
	return nil
}

func (s *RoomService) SetAnswer(ctx context.Context, connID, roomID, questionID, username, response string) error {
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	_, err = s.q.SetUserAnswer(ctx, dbsqlc.SetUserAnswerParams{
		ID: uid, QuestionID: questionID, Username: username, Response: response,
	})
	return err
}

func (s *RoomService) ShowAnswers(ctx context.Context, connID, roomID string) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	room, err := s.q.GetRoomWithQuestions(ctx, uid)
	if err != nil {
		return err
	}
	s.notifier.NotifyRoom(roomID, "showAnswers", room)
	return nil
}

func (s *RoomService) SetPointsAndEnd(ctx context.Context, connID, roomID string, answers json.RawMessage, version int32) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	room, err := s.q.SetPointsAndEndRoom(ctx, dbsqlc.SetPointsAndEndRoomParams{
		ID: uid, Answers: answers, Version: version,
	})
	if err != nil {
		return ErrVersionConflict
	}
	s.notifier.NotifyRoom(roomID, "showResult", room)
	return nil
}

func (s *RoomService) PassToReview(ctx context.Context, roomID string) error {
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	_, err = s.q.PassRoomToReview(ctx, uid)
	return err
}

func (s *RoomService) RemovePlayer(ctx context.Context, connID, roomID, targetUsername string) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	if _, err := s.q.RemovePlayerFromRoom(ctx, dbsqlc.RemovePlayerFromRoomParams{ID: uid, Username: targetUsername}); err != nil {
		return err
	}
	s.notifier.NotifyRoom(roomID, "removedPlayer", map[string]string{"username": targetUsername})
	return nil
}

func (s *RoomService) Leave(ctx context.Context, connID, roomID, username string) error {
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	if _, err := s.q.RemovePlayerFromRoom(ctx, dbsqlc.RemovePlayerFromRoomParams{ID: uid, Username: username}); err != nil {
		return err
	}
	s.notifier.LeaveRoom(roomID, connID)
	s.notifier.NotifyRoom(roomID, "removedPlayer", map[string]string{"username": username})
	return nil
}

func (s *RoomService) ChangeIndexAnswers(ctx context.Context, connID, roomID string, index int32) error {
	if !s.notifier.IsOwner(roomID, connID) {
		return ErrNotOwner
	}
	uid, err := uuid.Parse(roomID)
	if err != nil {
		return ErrRoomNotFound
	}
	if _, err := s.q.GetRoomForOwner(ctx, dbsqlc.GetRoomForOwnerParams{ID: uid, Status: "Review"}); err != nil {
		return ErrRoomNotFound
	}
	s.notifier.NotifyRoom(roomID, "changeIndexAnswers", index)
	return nil
}
```

- [ ] **Étape 4 : Lancer les tests**

```bash
cd apps/keyrigme-server && go test ./internal/service/... -run TestRoom
```

Résultat attendu : `PASS`

- [ ] **Étape 5 : Lancer tous les tests**

```bash
cd apps/keyrigme-server && go test ./...
```

Résultat attendu : `PASS` sur tous les packages.

- [ ] **Étape 6 : Commit**

```bash
git add apps/keyrigme-server/internal/service/
git commit -m "feat(keyrigme-server): RoomService with TDD"
```

---

## Task 8 : Handlers HTTP + WebSocket

**Files:**
- Create: `apps/keyrigme-server/internal/handler/http.go`
- Create: `apps/keyrigme-server/internal/handler/ws.go`

- [ ] **Étape 1 : Créer `http.go`**

```go
// apps/keyrigme-server/internal/handler/http.go
package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"keyrigme-server/internal/service"
)

type HTTPHandler struct {
	questionSvc *service.QuestionService
}

func NewHTTPHandler(q *service.QuestionService) *HTTPHandler {
	return &HTTPHandler{questionSvc: q}
}

func (h *HTTPHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /questions/count-by-category", h.countByCategory)
	mux.HandleFunc("GET /questions/seed", h.seed)
	mux.HandleFunc("GET /questions/reset", h.reset)
}

func (h *HTTPHandler) countByCategory(w http.ResponseWriter, r *http.Request) {
	rows, err := h.questionSvc.CountByCategory(r.Context())
	if err != nil {
		slog.Error("countByCategory", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, rows)
}

func (h *HTTPHandler) seed(w http.ResponseWriter, r *http.Request) {
	n, err := h.questionSvc.Seed(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]int{"inserted": n})
}

func (h *HTTPHandler) reset(w http.ResponseWriter, r *http.Request) {
	n, err := h.questionSvc.Reset(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]int{"inserted": n})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
```

- [ ] **Étape 2 : Créer `ws.go`**

```go
// apps/keyrigme-server/internal/handler/ws.go
package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"keyrigme-server/internal/hub"
	"keyrigme-server/internal/service"

	"nhooyr.io/websocket"
)

type WSHandler struct {
	hub         *hub.Hub
	roomSvc     *service.RoomService
	questionSvc *service.QuestionService
	corsOrigins []string
}

func NewWSHandler(h *hub.Hub, r *service.RoomService, q *service.QuestionService, corsOrigins []string) *WSHandler {
	return &WSHandler{hub: h, roomSvc: r, questionSvc: q, corsOrigins: corsOrigins}
}

type inboundMsg struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: h.corsOrigins,
	})
	if err != nil {
		slog.Error("ws accept", "err", err)
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	connID := h.hub.Register(ctx, conn)
	defer h.hub.Unregister(connID)

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			slog.Debug("ws read closed", "connID", connID, "err", err)
			return
		}
		var msg inboundMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid message format"})
			continue
		}
		h.dispatch(ctx, connID, msg)
	}
}

func (h *WSHandler) dispatch(ctx context.Context, connID string, msg inboundMsg) {
	switch msg.Event {
	case "createRoom":
		var dto struct {
			Username string `json:"username"`
			Avatar   string `json:"avatar"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil || dto.Username == "" || dto.Avatar == "" {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.Create(ctx, connID, dto.Username, dto.Avatar); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "joinRoom":
		var dto struct {
			Code     string `json:"code"`
			Username string `json:"username"`
			Avatar   string `json:"avatar"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil || dto.Code == "" {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.Join(ctx, connID, dto.Code, dto.Username, dto.Avatar); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "updateRoomConfig":
		var dto struct {
			RoomID      string   `json:"roomId"`
			NoOfPlayers int32    `json:"noOfPlayers"`
			NoOfRounds  int32    `json:"noOfRounds"`
			Categories  []string `json:"categories"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.UpdateConfig(ctx, connID, dto.RoomID, dto.NoOfPlayers, dto.NoOfRounds, dto.Categories); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "startQuizz":
		var roomID string
		if err := json.Unmarshal(msg.Data, &roomID); err != nil || roomID == "" {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		// Récupère la room pour connaître noOfRounds et categories avant de tirer les questions
		questions, err := h.questionSvc.GetRandom(ctx, 5, []string{"OLD_TESTIMONY", "NEW_TESTIMONY"})
		if err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "could not fetch questions"})
			return
		}
		if err := h.roomSvc.Start(ctx, connID, roomID, questions); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "playerAnswer":
		var dto struct {
			RoomID     string `json:"roomId"`
			QuestionID string `json:"questionId"`
			Username   string `json:"username"`
			Response   string `json:"response"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.SetAnswer(ctx, connID, dto.RoomID, dto.QuestionID, dto.Username, dto.Response); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "showAnswers":
		var roomID string
		json.Unmarshal(msg.Data, &roomID)
		if err := h.roomSvc.ShowAnswers(ctx, connID, roomID); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "setUserPoints":
		var dto struct {
			RoomID  string          `json:"roomId"`
			Answers json.RawMessage `json:"answers"`
			Version int32           `json:"version"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.SetPointsAndEnd(ctx, connID, dto.RoomID, dto.Answers, dto.Version); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "changeIndexAnswers":
		var dto struct {
			RoomID string `json:"roomId"`
			Index  int32  `json:"index"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.ChangeIndexAnswers(ctx, connID, dto.RoomID, dto.Index); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "removePlayer":
		var dto struct {
			RoomID   string `json:"roomId"`
			Username string `json:"username"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.RemovePlayer(ctx, connID, dto.RoomID, dto.Username); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	case "leaveRoom":
		var dto struct {
			RoomID   string `json:"roomId"`
			Username string `json:"username"`
		}
		if err := json.Unmarshal(msg.Data, &dto); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": "invalid payload"})
			return
		}
		if err := h.roomSvc.Leave(ctx, connID, dto.RoomID, dto.Username); err != nil {
			h.hub.NotifySocket(connID, "error", map[string]string{"message": err.Error()})
		}

	default:
		slog.Warn("unknown ws event", "connID", connID, "event", msg.Event)
	}
}

// corsOriginMatch vérifie si une origin est dans la liste (supporte les wildcards de nhooyr.io/websocket).
func corsOriginMatch(origins []string, origin string) bool {
	for _, o := range origins {
		if o == "*" || strings.EqualFold(o, origin) {
			return true
		}
	}
	return false
}
```

- [ ] **Étape 3 : Vérifier que ça compile**

```bash
cd apps/keyrigme-server && go build ./internal/handler/...
```

- [ ] **Étape 4 : Commit**

```bash
git add apps/keyrigme-server/internal/handler/
git commit -m "feat(keyrigme-server): HTTP and WebSocket handlers"
```

---

## Task 9 : Bootstrap main.go

**Files:**
- Create: `apps/keyrigme-server/cmd/server/main.go`

- [ ] **Étape 1 : Créer `main.go`**

```go
// apps/keyrigme-server/cmd/server/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"keyrigme-server/internal/handler"
	"keyrigme-server/internal/hub"
	dbsqlc "keyrigme-server/internal/db/sqlc"
	"keyrigme-server/internal/service"
	"keyrigme-server/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	corsOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(corsOrigins) == 0 || corsOrigins[0] == "" {
		corsOrigins = []string{"http://localhost:4200"}
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	queries := dbsqlc.New(pool)
	h := hub.New()

	questionSvc := service.NewQuestionService(queries)

	sendQWorker := worker.NewSendQuestionWorker(h)
	endQuizzWorker := worker.NewEndQuizzWorker(h)

	workers := river.NewWorkers()
	river.AddWorker(workers, sendQWorker)
	river.AddWorker(workers, endQuizzWorker)

	riverClient, err := river.NewClient(riverpgxv5.New(pool), &river.Config{
		Queues:  map[string]river.QueueConfig{river.QueueDefault: {MaxWorkers: 10}},
		Workers: workers,
	})
	if err != nil {
		log.Fatalf("river client: %v", err)
	}

	roomSvc := service.NewRoomService(queries, h, riverClient) // river.Client non générique en v0.14+
	endQuizzWorker.SetRoomService(roomSvc)

	if err := riverClient.Start(ctx); err != nil {
		log.Fatalf("river start: %v", err)
	}

	mux := http.NewServeMux()
	handler.NewHTTPHandler(questionSvc).RegisterRoutes(mux)
	mux.Handle("/ws", handler.NewWSHandler(h, roomSvc, questionSvc, corsOrigins))

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: mux,
	}

	go func() {
		slog.Info("keyrigme-server listening", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down...")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	riverClient.Stop(shutCtx)
	srv.Shutdown(shutCtx)
}
```

- [ ] **Étape 2 : Vérifier que ça compile**

```bash
cd apps/keyrigme-server && go build ./cmd/server
```

Résultat attendu : binaire créé, aucune erreur.

- [ ] **Étape 3 : Smoke test — démarrer le serveur**

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/keyrigme?sslmode=disable" \
  go run ./cmd/server
```

Dans un autre terminal :

```bash
curl http://localhost:3000/questions/seed
# Résultat attendu : {"inserted":10}

curl http://localhost:3000/questions/count-by-category
# Résultat attendu : tableau JSON avec les catégories et leurs counts
```

- [ ] **Étape 4 : Lancer tous les tests Go**

```bash
cd apps/keyrigme-server && go test ./...
```

Résultat attendu : `PASS`

- [ ] **Étape 5 : Commit**

```bash
git add apps/keyrigme-server/cmd/server/
git commit -m "feat(keyrigme-server): main bootstrap and full server wired up"
```

---

## Task 10 : Frontend — Mettre à jour keyrigme-models

**Files:**
- Modify: `libs/keyrigme-models/src/lib/types/room.type.ts`

- [ ] **Étape 1 : Mettre à jour `room.type.ts`**

```typescript
// libs/keyrigme-models/src/lib/types/room.type.ts
import { QuestionCategoriesValues } from './question.type';
import type { RoomStatus } from '../constants';

export type RoomStatusTypesValues = keyof typeof RoomStatus;

export interface IRoom {
  id: string;          // Était _id (MongoDB ObjectId). Maintenant UUID PostgreSQL.
  code: string;
  noOfPlayers: number;
  noOfRounds: number;
  categories: QuestionCategoriesValues[];
  players: Player[];
  owner: Player;
  answers: Answers;
  bonus: UserBonus;
  questions: string[];
  status: RoomStatusTypesValues;
  version: number;     // Nouveau : optimistic locking
  createdAt: string;
  updatedAt: string;
}

export type RoomWithoutId = Omit<IRoom, 'id'>;

export type RoomConfig = {
  noOfPlayers: number;
  noOfRounds: number;
  categories: QuestionCategoriesValues[];
};

// socketId supprimé : le serveur Go ne le stocke pas en base.
// L'identification des joueurs passe par username.
export type Player = {
  username: string;
  avatar: string;
};

export type Answers = Record<string, Record<string, Answer>>;

export type Answer = {
  response: string;
  point: number;
};

export type Bonus = {
  point: number;
};

export type UserBonus = Record<string, Bonus>;
```

- [ ] **Étape 2 : Vérifier les erreurs de compilation TypeScript**

```bash
pnpm nx run keyrigme-front:build 2>&1 | grep -i error | head -20
```

Résultat attendu : erreurs liées à `_id` et `socketId` dans le front — elles seront corrigées dans les tâches suivantes.

- [ ] **Étape 3 : Commit**

```bash
git add libs/keyrigme-models/src/lib/types/room.type.ts
git commit -m "feat(keyrigme-models): remove socketId from Player, rename _id to id, add version"
```

---

## Task 11 : Frontend — Réécrire QuizzSocketService

**Files:**
- Modify: `apps/keyrigme-front/src/app/app.config.ts`
- Modify: `apps/keyrigme-front/src/app/shared/services/quizz-socket.service.ts`

- [ ] **Étape 1 : Mettre à jour `app.config.ts`**

```typescript
// apps/keyrigme-front/src/app/app.config.ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(appRoutes),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
  ],
};
```

- [ ] **Étape 2 : Réécrire `quizz-socket.service.ts`**

```typescript
// apps/keyrigme-front/src/app/shared/services/quizz-socket.service.ts
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { filter, map, share } from 'rxjs/operators';
import { Observable } from 'rxjs';
import type {
  Answers,
  IQuestion,
  IRoom,
  Player,
  RoomConfig,
} from '@keyrigme/keyrigme-models';

interface WsMessage<T = unknown> {
  event: string;
  data: T;
}

const WS_URL = 'ws://localhost:3000/ws';

@Injectable({ providedIn: 'root' })
export class QuizzSocketService {
  private socket$: WebSocketSubject<WsMessage> = webSocket<WsMessage>(WS_URL);

  // Le stream partagé depuis lequel on filtre par event
  private messages$ = this.socket$.pipe(share());

  private on<T>(event: string): Observable<T> {
    return this.messages$.pipe(
      filter((msg) => msg.event === event),
      map((msg) => msg.data as T),
    );
  }

  private emit(event: string, data: unknown): void {
    this.socket$.next({ event, data } as WsMessage);
  }

  // --- Émetteurs ---

  createRoom(username: string, avatar: string): void {
    this.emit('createRoom', { username, avatar });
  }

  joinRoom(code: string, username: string, avatar: string): void {
    this.emit('joinRoom', { code, username, avatar });
  }

  leaveRoom(roomId: string, username: string): void {
    this.emit('leaveRoom', { roomId, username });
  }

  removePlayer(roomId: string, username: string): void {
    this.emit('removePlayer', { roomId, username });
  }

  updateRoomConfig(roomId: string, config: RoomConfig): void {
    this.emit('updateRoomConfig', { ...config, roomId });
  }

  startQuizz(roomId: string): void {
    this.emit('startQuizz', roomId);
  }

  showAnswers(roomId: string): void {
    this.emit('showAnswers', roomId);
  }

  setUserPoints(roomId: string, answers: Answers, version: number): void {
    this.emit('setUserPoints', { roomId, answers, version });
  }

  playerAnswer(roomId: string, questionId: string, username: string, response: string): void {
    this.emit('playerAnswer', { roomId, questionId, username, response });
  }

  indexAnswersChange(roomId: string, index: number): void {
    this.emit('changeIndexAnswers', { roomId, index });
  }

  // --- Receveurs ---

  roomCreated(): Observable<IRoom>   { return this.on<IRoom>('roomCreated'); }
  roomJoined(): Observable<IRoom>    { return this.on<IRoom>('roomJoined'); }
  addPlayer(): Observable<Player>    { return this.on<Player>('addPlayer'); }
  quizzStarted(): Observable<void>   { return this.on<void>('quizzStarted'); }
  removedPlayer(): Observable<{ username: string }> { return this.on('removedPlayer'); }
  newRoundData(): Observable<IQuestion>  { return this.on<IQuestion>('newRoundData'); }
  onShowResult(): Observable<IRoom>  { return this.on<IRoom>('showResult'); }
  onEndQuizz(): Observable<void>     { return this.on<void>('endQuizz'); }
  onShowAnswers(): Observable<IRoom> { return this.on<IRoom>('showAnswers'); }
  onRoonConfigUpdated(): Observable<IRoom> { return this.on<IRoom>('roomConfigUpdated'); }
  onIndexAnswersChange(): Observable<number> { return this.on<number>('changeIndexAnswers'); }
}
```

- [ ] **Étape 3 : Commit**

```bash
git add apps/keyrigme-front/src/app/app.config.ts \
        apps/keyrigme-front/src/app/shared/services/quizz-socket.service.ts
git commit -m "feat(keyrigme-front): replace ngx-socket-io with RxJS webSocket"
```

---

## Task 12 : Frontend — Mettre à jour le store et les composants

**Files:**
- Modify: `apps/keyrigme-front/src/app/store/quizz/quizz.type.ts`
- Modify: `apps/keyrigme-front/src/app/store/quizz/quizz.store.ts`

- [ ] **Étape 1 : Mettre à jour `quizz.type.ts`**

```typescript
// apps/keyrigme-front/src/app/store/quizz/quizz.type.ts
import {
  CATEGORIES_VALUES,
  type IQuestion,
  type IRoom,
} from '@keyrigme/keyrigme-models';

export type QuizzState = {
  room: IRoom | null;
  questions: IQuestion[];
  myUsername: string | null;  // Nouveau : identifiant local du joueur courant
};

export const DEFAULT_ROMM_CONFIG = {
  noOfPlayers: 5,
  noOfRounds: 5,
  categories: CATEGORIES_VALUES,
};
```

- [ ] **Étape 2 : Mettre à jour `quizz.store.ts`**

```typescript
// apps/keyrigme-front/src/app/store/quizz/quizz.store.ts
import { signalStore, withComputed, withProps, withState } from '@ngrx/signals';
import { on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { quizzEvents } from './quizz.event';
import { DEFAULT_ROMM_CONFIG, QuizzState } from './quizz.type';
import {
  addPlayerFn,
  updateRoomfn,
  getUserPoints,
  newRoundDataFn,
  removePlayerFn,
  updateValidityAnswerFn,
} from './quizz.fn';
import { QuizzSocketService } from '../../shared/services/quizz-socket.service';
import { computed, inject } from '@angular/core';
import { map, tap } from 'rxjs';
import { PAGES } from '../../shared/constants/pages.const';
import { Router } from '@angular/router';

export const initialQuizzState: QuizzState = {
  room: null,
  questions: [],
  myUsername: null,
};

export const QuizzStore = signalStore(
  { providedIn: 'root' },
  withState<QuizzState>(initialQuizzState),
  withProps(() => ({
    _quizzSocketService: inject(QuizzSocketService),
    _router: inject(Router),
  })),
  withComputed(({ room }) => ({
    players: computed(() => room()?.players ?? []),
  })),
  withComputed(({ room, myUsername, players }) => ({
    // isOwner compare le username local au username du owner (plus de socketId)
    isOwner: computed(() => {
      const r = room();
      const me = myUsername();
      if (!r || !me) return false;
      return r.owner.username === me;
    }),
    roomConfig: computed(() => {
      const roomValue = room();
      if (!roomValue) return DEFAULT_ROMM_CONFIG;
      return {
        noOfPlayers: roomValue.noOfPlayers,
        noOfRounds: roomValue.noOfRounds,
        categories: roomValue.categories,
      };
    }),
    playersPoint: computed(() => getUserPoints(players(), room()?.answers)),
    answers: computed(() => room()?.answers ?? null),
  })),
  withEventHandlers(
    (store) => ({
      roomCreated$: store._quizzSocketService.roomCreated().pipe(
        map((room) => quizzEvents.createRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Lobby])),
      ),

      roomJoined$: store._quizzSocketService.roomJoined().pipe(
        map((room) => quizzEvents.createRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Lobby])),
      ),

      playerAdded$: store._quizzSocketService
        .addPlayer()
        .pipe(map((player) => quizzEvents.addPlayer(player))),

      playerRemoved$: store._quizzSocketService
        .removedPlayer()
        .pipe(map((player) => quizzEvents.removePlayer(player))),

      quizzStarted$: store._quizzSocketService
        .quizzStarted()
        .pipe(tap(() => store._router.navigate([PAGES.Play]))),

      newRoundData$: store._quizzSocketService
        .newRoundData()
        .pipe(map((round) => quizzEvents.newRoundData(round))),

      showAnswers$: store._quizzSocketService.onShowAnswers().pipe(
        tap(() => void store._router.navigate([PAGES.PlayersAnswers])),
        map((room) => quizzEvents.joinRoomSuccess(room)),
      ),

      roonConfigUpdated$: store._quizzSocketService
        .onRoonConfigUpdated()
        .pipe(map((room) => quizzEvents.quizzUpdatedSuccess(room))),

      playersAnswerIndex$: store._quizzSocketService
        .onIndexAnswersChange()
        .pipe(map((index) => quizzEvents.updatePlayerAnswerIndex({ index }))),

      showResult$: store._quizzSocketService.onShowResult().pipe(
        map((room) => quizzEvents.joinRoomSuccess(room)),
        tap(() => store._router.navigate([PAGES.Result])),
      ),
    }),
  ),
  withReducer(
    on(quizzEvents.createRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.joinRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.quizzUpdatedSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.newRoundData, ({ payload }) => newRoundDataFn(payload)),
    on(quizzEvents.addPlayer, ({ payload: player }) => addPlayerFn(player)),
    on(quizzEvents.removePlayer, ({ payload: player }) =>
      removePlayerFn(player),
    ),
    on(quizzEvents.updateValidityAnswer, ({ payload: data }) =>
      updateValidityAnswerFn(data),
    ),
  ),
);
```

> **Note :** `isOwner` et `isItSelf` ne peuvent plus se baser sur `socketId`. L'approche correcte est de stocker `myUsername` dans le state (via un event `setMyUsername` déclenché à la création/join) et comparer `room.owner.username === myUsername()`. Les composants qui appellent `isItSelf(player.socketId)` doivent être mis à jour pour passer `player.username`. Cette logique dépend des composants qui consomment le store — identifier et corriger les erreurs TypeScript restantes avec `pnpm nx run keyrigme-front:build`.

- [ ] **Étape 3 : Corriger les erreurs TypeScript restantes**

```bash
pnpm nx run keyrigme-front:build 2>&1 | grep "error TS"
```

Pour chaque erreur :
- `_id` → remplacer par `id`
- `player.socketId` → remplacer par `player.username`
- `socket.ioSocket.id` → supprimer (n'existe plus)

- [ ] **Étape 4 : Build complet sans erreur**

```bash
pnpm nx run keyrigme-front:build
```

Résultat attendu : build réussi, zéro erreur TS.

- [ ] **Étape 5 : Supprimer ngx-socket-io des dépendances**

```bash
pnpm remove ngx-socket-io
```

- [ ] **Étape 6 : Commit final**

```bash
git add apps/keyrigme-front/ libs/keyrigme-models/
git commit -m "feat(keyrigme-front): migrate from ngx-socket-io to RxJS webSocket"
```

---

## Checklist de vérification finale

- [ ] `pnpm nx run keyrigme-server:test` → PASS
- [ ] `pnpm nx run keyrigme-server:build` → binaire créé
- [ ] `pnpm nx run keyrigme-server:migrate` → migrations appliquées
- [ ] `curl localhost:3000/questions/seed` → `{"inserted":10}`
- [ ] `curl localhost:3000/questions/count-by-category` → tableau JSON
- [ ] `pnpm nx run keyrigme-front:build` → zéro erreur TS
- [ ] Test manuel : ouvrir le front, créer une room, joindre depuis un autre onglet
