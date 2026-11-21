import {
  CurrentPlayer,
  Forbidden,
  InvalidState,
  QuizzRpcs,
  RoomStatus,
  type IRoom,
} from '@keyrigme/models';
import { Effect, Option, Stream } from 'effect';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { RoomRepository, type Membership } from '../repositories/RoomRepository';
import { QuizzRunner } from '../services/QuizzRunner';
import { RoomHub } from '../services/RoomHub';

export const QuizzHandlers = QuizzRpcs.toLayer(
  Effect.gen(function* () {
    const rooms = yield* RoomRepository;
    const questions = yield* QuestionRepository;
    const hub = yield* RoomHub;
    const runner = yield* QuizzRunner;

    /** Reads the room as sent to clients; the room is known to exist at this point. */
    const view = (roomId: string): Effect.Effect<IRoom> =>
      rooms.findView(roomId).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.die(`Room ${roomId} disappeared`),
            onSome: Effect.succeed,
          }),
        ),
      );

    const toSession = (membership: Membership) =>
      Effect.map(view(membership.roomId), (room) => ({
        room,
        playerId: membership.playerId,
        sessionToken: membership.sessionToken,
      }));

    /** Ensures the caller owns its room and returns the room metadata. */
    const requireOwner = Effect.gen(function* () {
      const me = yield* CurrentPlayer;
      const meta = yield* rooms.findMeta(me.roomId);
      if (Option.isNone(meta)) return yield* new Forbidden({ message: 'Room not found.' });
      if (meta.value.ownerPlayerId !== me.playerId) {
        return yield* new Forbidden({ message: 'Only the room owner can do this.' });
      }
      return { me, meta: meta.value };
    });

    return QuizzRpcs.of({
      CreateRoom: Effect.fn('CreateRoom')(function* (identity) {
        return yield* toSession(yield* rooms.create(identity));
      }),

      JoinRoom: Effect.fn('JoinRoom')(function* ({ code, ...identity }) {
        const { player, ...membership } = yield* rooms.join(code, identity);
        yield* hub.publish(membership.roomId, { _tag: 'PlayerAdded', player });
        return yield* toSession(membership);
      }),

      ResumeSession: Effect.fn('ResumeSession')(function* () {
        const me = yield* CurrentPlayer;
        return { room: yield* view(me.roomId), playerId: me.playerId };
      }),

      SubscribeRoom: () =>
        Stream.unwrap(
          Effect.gen(function* () {
            const me = yield* CurrentPlayer;
            // A removed player (RemovePlayer or LeaveRoom) gets their own PlayerRemoved, then the stream ends:
            // their session is gone, they must not receive the rest of the game.
            return hub
              .subscribe(me.roomId)
              .pipe(Stream.takeUntil((event) => event._tag === 'PlayerRemoved' && event.playerId === me.playerId));
          }),
        ),

      UpdateRoomConfig: Effect.fn('UpdateRoomConfig')(function* (config) {
        const { me } = yield* requireOwner;
        const updated = yield* rooms.updateConfig(me.roomId, config);
        if (!updated) return yield* new InvalidState({ message: 'The game has already started.' });
        yield* hub.publish(me.roomId, { _tag: 'RoomConfigUpdated', room: yield* view(me.roomId) });
      }),

      StartQuizz: Effect.fn('StartQuizz')(function* () {
        const { me, meta } = yield* requireOwner;
        if (meta.status !== RoomStatus.Initial) {
          return yield* new InvalidState({ message: 'The game has already started.' });
        }
        const drawn = yield* questions.getRandom(meta.noOfRounds, meta.categories);
        if (drawn.length === 0) {
          return yield* new InvalidState({ message: 'No question matches the selected categories.' });
        }
        const started = yield* rooms.start(
          me.roomId,
          drawn.map((q) => q.id),
        );
        if (!started) return yield* new InvalidState({ message: 'The game has already started.' });
        yield* hub.publish(me.roomId, { _tag: 'QuizzStarted' });
        yield* runner.start(me.roomId, drawn);
      }),

      PlayerAnswer: Effect.fn('PlayerAnswer')(function* ({ questionId, response }) {
        const me = yield* CurrentPlayer;
        const saved = yield* rooms.setAnswer(me.roomId, questionId, me.playerId, response);
        if (!saved) return yield* new InvalidState({ message: 'Could not save answer.' });
      }),

      ShowAnswers: Effect.fn('ShowAnswers')(function* () {
        const { me } = yield* requireOwner;
        // Closes the answers first, so that no player can change theirs once the solutions are sent.
        const revealed = yield* rooms.revealAnswers(me.roomId);
        if (!revealed) return yield* new InvalidState({ message: 'The game is not finished yet.' });
        const room = yield* view(me.roomId);
        yield* hub.publish(me.roomId, {
          _tag: 'ShowAnswers',
          room,
          questions: yield* questions.findByIds(room.questions),
        });
      }),

      SetUserPoints: Effect.fn('SetUserPoints')(function* ({ answers }) {
        const { me } = yield* requireOwner;
        const ended = yield* rooms.setPointsAndEnd(me.roomId, answers);
        if (!ended) return yield* new InvalidState({ message: 'The room is not in review.' });
        yield* hub.publish(me.roomId, { _tag: 'ShowResult', room: yield* view(me.roomId) });
      }),

      ReplayQuizz: Effect.fn('ReplayQuizz')(function* () {
        const { me } = yield* requireOwner;
        const reset = yield* rooms.reset(me.roomId);
        if (!reset) return yield* new InvalidState({ message: 'The game is not finished yet.' });
        yield* hub.publish(me.roomId, { _tag: 'QuizzReset', room: yield* view(me.roomId) });
      }),

      ChangeIndexAnswers: Effect.fn('ChangeIndexAnswers')(function* ({ index }) {
        const { me, meta } = yield* requireOwner;
        if (meta.status !== RoomStatus.Review) {
          return yield* new InvalidState({ message: 'The room is not in review.' });
        }
        yield* hub.publish(me.roomId, { _tag: 'ChangeIndexAnswers', index, from: me.playerId });
      }),

      RemovePlayer: Effect.fn('RemovePlayer')(function* ({ playerId }) {
        const { me, meta } = yield* requireOwner;
        if (playerId === me.playerId) {
          return yield* new Forbidden({ message: 'The owner cannot remove themself.' });
        }
        if (meta.status !== RoomStatus.Initial) {
          return yield* new InvalidState({ message: 'Players can only be removed before the game starts.' });
        }
        const removed = yield* rooms.removePlayer(me.roomId, playerId);
        if (!removed) return yield* new Forbidden({ message: 'This player is not in the room.' });
        yield* hub.publish(me.roomId, { _tag: 'PlayerRemoved', playerId });
      }),

      LeaveRoom: Effect.fn('LeaveRoom')(function* () {
        const me = yield* CurrentPlayer;
        const meta = yield* rooms.findMeta(me.roomId);
        // The owner keeps their session: without it, no one could run the room any more.
        if (Option.isSome(meta) && meta.value.ownerPlayerId === me.playerId) return;
        // Leaving once the results are shown keeps the player out of the next game (ReplayQuizz).
        if (Option.isSome(meta) && meta.value.status !== RoomStatus.Initial && meta.value.status !== RoomStatus.Ended) {
          return yield* new InvalidState({ message: 'The room can only be left before or after a game.' });
        }
        if (yield* rooms.removePlayer(me.roomId, me.playerId)) {
          yield* hub.publish(me.roomId, { _tag: 'PlayerRemoved', playerId: me.playerId });
        }
      }),
    });
  }),
);
