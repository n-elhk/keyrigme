import { CurrentPlayer, SESSION_HEADER, SessionAuth, Unauthorized } from '@keyrigme/models';
import { Effect, Layer, Option } from 'effect';
import { Headers } from 'effect/http';
import { RoomRepository } from '../repositories/RoomRepository';

/** Resolves the session token header into the `CurrentPlayer` of the request. */
export const SessionAuthLive = Layer.effect(
  SessionAuth,
  Effect.gen(function* () {
    const rooms = yield* RoomRepository;
    return SessionAuth.of((effect, { headers }) =>
      Effect.gen(function* () {
        const token = Headers.get(headers, SESSION_HEADER);
        if (Option.isNone(token)) return yield* new Unauthorized();
        const session = yield* rooms.findSession(token.value);
        if (Option.isNone(session)) return yield* new Unauthorized();
        return yield* Effect.provideService(effect, CurrentPlayer, session.value);
      }),
    );
  }),
);
