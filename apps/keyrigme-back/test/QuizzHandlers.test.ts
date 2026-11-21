import { assert, describe, it } from '@effect/vitest';
import { QuizzRpcs, RoomStatus, SESSION_HEADER, type IRoom, type RoomStatusTypesValues } from '@keyrigme/models';
import { Cause, Effect, Exit, Fiber, Layer, Option, Schema, Stream } from 'effect';
import { RpcTest } from 'effect/rpc';
import { QuestionRepository } from '../src/repositories/QuestionRepository';
import { RoomRepository } from '../src/repositories/RoomRepository';
import { QuizzHandlers } from '../src/rpc/QuizzHandlers';
import { SessionAuthLive } from '../src/rpc/SessionAuthLive';
import { QuizzRunner } from '../src/services/QuizzRunner';
import { RoomHub } from '../src/services/RoomHub';

const OWNER_ID = '6f1c2a3e-8b4d-4e5f-9a6b-7c8d9e0f1a2b';
const GUEST_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const sessions: Record<string, { roomId: string; playerId: string }> = {
  'owner-token': { roomId: 'room-1', playerId: OWNER_ID },
  'guest-token': { roomId: 'room-1', playerId: GUEST_ID },
};
const ownerH = { headers: { [SESSION_HEADER]: 'owner-token' } };
const guestH = { headers: { [SESSION_HEADER]: 'guest-token' } };

/** Handlers over mocked dependencies, for a room owned by OWNER_ID in the given status. */
const makeTestLayer = (options: {
  readonly status?: RoomStatusTypesValues;
  readonly rooms?: Partial<RoomRepository['Service']>;
  readonly questions?: Partial<QuestionRepository['Service']>;
  readonly runner?: Partial<QuizzRunner['Service']>;
} = {}) =>
  Layer.mergeAll(QuizzHandlers, SessionAuthLive).pipe(
    Layer.provide([
      Layer.mock(RoomRepository, {
        findSession: (token) => Effect.succeed(Option.fromNullishOr(sessions[token])),
        findMeta: (roomId) =>
          Effect.succeed(
            Option.some({
              id: roomId,
              status: options.status ?? RoomStatus.Initial,
              ownerPlayerId: OWNER_ID,
              noOfRounds: 1,
              categories: [],
            }),
          ),
        removePlayer: () => Effect.die('removePlayer must not be reached'),
        ...options.rooms,
      }),
      Layer.mock(QuestionRepository, { ...options.questions }),
      Layer.mock(QuizzRunner, { ...options.runner }),
      RoomHub.layer,
    ]),
  );

const owner = { playerId: OWNER_ID, username: 'owner', avatar: 'a.png' };
/** Room as read back after a reset: in the lobby, without the previous game. */
const RESET_ROOM: IRoom = {
  id: 'room-1',
  code: 'code',
  status: RoomStatus.Initial,
  noOfPlayers: 5,
  noOfRounds: 1,
  categories: [],
  owner,
  players: [owner, { playerId: GUEST_ID, username: 'guest', avatar: 'b.png' }],
  questions: [],
  answers: {},
  bonus: {},
};

const failureTag = (exit: Exit.Exit<unknown, { readonly _tag: string }>) =>
  Exit.isFailure(exit) ? Option.map(Exit.findErrorOption(exit), (e) => e._tag) : Option.none();

describe('QuizzHandlers', () => {
  it.effect('rejects calls without a valid session token', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const missing = yield* Effect.exit(client.StartQuizz());
      const unknown = yield* Effect.exit(client.StartQuizz(undefined, { headers: { [SESSION_HEADER]: 'nope' } }));
      assert.deepStrictEqual(failureTag(missing), Option.some('Unauthorized'));
      assert.deepStrictEqual(failureTag(unknown), Option.some('Unauthorized'));
    }).pipe(Effect.provide(makeTestLayer())),
  );

  it.effect('only lets the owner start the quizz', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.StartQuizz(undefined, guestH));
      assert.deepStrictEqual(failureTag(exit), Option.some('Forbidden'));
    }).pipe(Effect.provide(makeTestLayer())),
  );

  it.effect('refuses to start a game without any question', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.StartQuizz(undefined, ownerH));
      assert.deepStrictEqual(failureTag(exit), Option.some('InvalidState'));
    }).pipe(
      Effect.provide(
        makeTestLayer({
          questions: { getRandom: () => Effect.succeed([]) },
          runner: { start: () => Effect.die('the game must not start') },
        }),
      ),
    ),
  );

  it.effect('prevents the owner from removing themself', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.RemovePlayer({ playerId: OWNER_ID }, ownerH));
      assert.deepStrictEqual(failureTag(exit), Option.some('Forbidden'));
    }).pipe(Effect.provide(makeTestLayer())),
  );

  it.effect('rejects a malformed player id before reaching the database', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.RemovePlayer({ playerId: 'abc' }, ownerH));
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) assert.notInclude(Cause.pretty(exit.cause), 'must not be reached');
    }).pipe(Effect.provide(makeTestLayer())),
  );

  it('validates ids in the payloads the server decodes', () => {
    const decode = (tag: 'RemovePlayer' | 'PlayerAnswer', payload: unknown) =>
      Exit.isSuccess(Schema.decodeUnknownExit(QuizzRpcs.requests.get(tag)!.payloadSchema)(payload));
    assert.isFalse(decode('RemovePlayer', { playerId: 'abc' }));
    assert.isTrue(decode('RemovePlayer', { playerId: GUEST_ID }));
    assert.isFalse(decode('PlayerAnswer', { questionId: 'x', response: '' }));
    assert.isTrue(decode('PlayerAnswer', { questionId: GUEST_ID, response: '' }));
  });

  it.effect('only lets the owner replay the quizz', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.ReplayQuizz(undefined, guestH));
      assert.deepStrictEqual(failureTag(exit), Option.some('Forbidden'));
    }).pipe(
      Effect.provide(
        makeTestLayer({ status: RoomStatus.Ended, rooms: { reset: () => Effect.die('reset must not be reached') } }),
      ),
    ),
  );

  it.effect('refuses to replay a game that is not finished', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const exit = yield* Effect.exit(client.ReplayQuizz(undefined, ownerH));
      assert.deepStrictEqual(failureTag(exit), Option.some('InvalidState'));
    }).pipe(Effect.provide(makeTestLayer({ status: RoomStatus.Review, rooms: { reset: () => Effect.succeed(false) } }))),
  );

  for (const status of [RoomStatus.Started, RoomStatus.Review]) {
    it.effect(`keeps every player while the game is running (${status})`, () =>
      Effect.gen(function* () {
        const client = yield* RpcTest.makeClient(QuizzRpcs);
        const removed = yield* Effect.exit(client.RemovePlayer({ playerId: GUEST_ID }, ownerH));
        const left = yield* Effect.exit(client.LeaveRoom(undefined, guestH));
        assert.deepStrictEqual(failureTag(removed), Option.some('InvalidState'));
        assert.deepStrictEqual(failureTag(left), Option.some('InvalidState'));
      }).pipe(Effect.provide(makeTestLayer({ status }))),
    );
  }

  it.effect('lets a player leave once the results are shown, but not be removed by the owner', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const removed = yield* Effect.exit(client.RemovePlayer({ playerId: GUEST_ID }, ownerH));
      const left = yield* Effect.exit(client.LeaveRoom(undefined, guestH));
      assert.deepStrictEqual(failureTag(removed), Option.some('InvalidState'));
      assert.isTrue(Exit.isSuccess(left));
    }).pipe(
      Effect.provide(makeTestLayer({ status: RoomStatus.Ended, rooms: { removePlayer: () => Effect.succeed(true) } })),
    ),
  );

  it.live('brings every player back to the lobby when the owner replays', () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      const guestEvents = yield* client.SubscribeRoom(undefined, guestH).pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
      yield* Effect.sleep('10 millis');

      yield* client.ReplayQuizz(undefined, ownerH);
      const [event] = yield* Fiber.join(guestEvents);
      assert.strictEqual(event._tag, 'QuizzReset');
      if (event._tag === 'QuizzReset') assert.strictEqual(event.room.status, RoomStatus.Initial);
    }).pipe(
      Effect.provide(
        makeTestLayer({
          status: RoomStatus.Ended,
          rooms: {
            reset: () => Effect.succeed(true),
            findView: (id) => Effect.succeed(Option.some({ ...RESET_ROOM, id })),
          },
        }),
      ),
      Effect.timeout('2 seconds'),
    ),
  );

  it.live("ends a removed player's event stream, not the others'", () =>
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(QuizzRpcs);
      // Without the fix, the guest stream never ends and the test times out.
      const guestEvents = yield* client.SubscribeRoom(undefined, guestH).pipe(
        Stream.map((event) => event._tag),
        Stream.runCollect,
        Effect.forkChild,
      );
      const ownerEvents = yield* client.SubscribeRoom(undefined, ownerH).pipe(
        Stream.map((event) => event._tag),
        Stream.take(2),
        Stream.runCollect,
        Effect.forkChild,
      );
      yield* Effect.sleep('10 millis');

      yield* client.RemovePlayer({ playerId: GUEST_ID }, ownerH);
      assert.deepStrictEqual(yield* Fiber.join(guestEvents), ['PlayerRemoved']);

      // The owner keeps receiving the room's events.
      yield* client.RemovePlayer({ playerId: GUEST_ID }, ownerH);
      assert.deepStrictEqual(yield* Fiber.join(ownerEvents), ['PlayerRemoved', 'PlayerRemoved']);
    }).pipe(
      Effect.provide(makeTestLayer({ rooms: { removePlayer: () => Effect.succeed(true) } })),
      Effect.timeout('2 seconds'),
    ),
  );
});
