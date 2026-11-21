# Keyrigme

Quiz multijoueur en temps réel.

| Package | Chemin | Stack |
| --- | --- | --- |
| `@keyrigme/front` | `apps/keyrigme-front` | Angular 22 (SSR), NgRx Signals, client Effect RPC |
| `@keyrigme/back` | `apps/keyrigme-back` | Effect 4 : RPC sur WebSocket, HttpApi, `@effect/sql-pg` |
| `@keyrigme/models` | `libs/keyrigme-models` | Contrats partagés : schémas, événements, erreurs, `QuizzRpcs`, `KeyrigmeApi` |

Monorepo **pnpm workspaces** (sans Nx). `@keyrigme/models` est consommé en source TypeScript via `workspace:*`.

## Démarrer

```sh
pnpm install
docker compose up -d                                  # PostgreSQL 19
cp apps/keyrigme-back/.env.example apps/keyrigme-back/.env
pnpm dev                                              # back :3000 + front :4200
```

Le front (http://localhost:4200) proxifie `/api` (HTTP) et `/rpc` (WebSocket) vers le back.
Les migrations et le seed des questions s'appliquent au démarrage du back (`apps/keyrigme-back/src/db/migrations.ts`).

## Tâches

```sh
pnpm -r typecheck | lint | test | build    # tous les packages
pnpm --filter @keyrigme/back test          # un seul package
pnpm --filter @keyrigme/back smoke         # partie complète via RPC contre un back lancé
```

## Architecture du back

- `rpc/QuizzHandlers.ts` : implémentation de `QuizzRpcs`. Le middleware `SessionAuth` résout le header `x-session-token`, renvoyé par `CreateRoom` et `JoinRoom`, en `CurrentPlayer`.
- `services/RoomHub.ts` : un `PubSub` par room, exposé aux clients par le stream `SubscribeRoom`.
- `services/QuizzRunner.ts` : une fiber par partie (`FiberMap`), qui cadence les questions avec `Effect.sleep`. Une partie en cours est perdue si le serveur redémarre.
- `repositories/` : accès PostgreSQL (`rooms`, `room_players`, `room_questions`, `answers`, `questions`).

## Docker

```sh
docker build -f apps/keyrigme-back/Dockerfile -t keyrigme-back .
```

L'image ne contient que le bundle esbuild (`dist/main.js`). Elle attend `DATABASE_URL`, et optionnellement `PORT` et `CORS_ORIGINS`.
