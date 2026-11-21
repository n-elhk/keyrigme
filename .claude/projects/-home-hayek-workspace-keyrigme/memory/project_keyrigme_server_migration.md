---
name: project-keyrigme-server-migration
description: Migration keyrigme-back (NestJS/MongoDB) → keyrigme-server (Go/PostgreSQL) — état d'avancement et décisions prises
metadata:
  type: project
---

Migration en cours de `keyrigme-back` vers `keyrigme-server`.

**Why:** Réécriture complète du backend en Go avec PostgreSQL pour des raisons de performance et de simplification de la stack infra (suppression RabbitMQ et MongoDB).

**How to apply:** Quand on reprend le travail, aller directement au plan d'implémentation sans re-brainstormer.

## Documents produits
- Spec : `docs/superpowers/specs/2026-06-03-keyrigme-server-go-design.md`
- Plan : `docs/superpowers/plans/2026-06-03-keyrigme-server-go.md`

## Stack cible décidée
- Go 1.23 + pgx v5 + sqlc + goose + riverqueue/river + nhooyr.io/websocket
- Frontend : RxJS `webSocket` (remplace `ngx-socket-io`)

## Décisions clés
- socketId jamais persisté en base — hub mémoire gère owners/rooms
- Players identifiés par `username` dans answers/bonus (plus de socketId)
- `isOwner` frontend = `room.owner.username === myUsername` (signal local)
- `river.Client` sans paramètre générique (v0.14+)
- `Player` type sans `socketId`, `IRoom._id` renommé en `id`

## État : PLAN ÉCRIT, PAS ENCORE IMPLÉMENTÉ
Aucun code Go écrit encore. Le plan est prêt à exécuter avec `superpowers:subagent-driven-development` ou `superpowers:executing-plans`.
