import { assert, describe, it } from '@effect/vitest';
import { Effect, Fiber, Stream } from 'effect';
import { RoomHub } from '../src/services/RoomHub';

const tags = (hub: RoomHub['Service'], roomId: string, count: number) =>
  hub.subscribe(roomId).pipe(
    Stream.map((event) => event._tag),
    Stream.take(count),
    Stream.runCollect,
    Effect.forkChild,
  );

describe('RoomHub', () => {
  it.effect('releases the room once its last subscriber leaves', () =>
    Effect.gen(function* () {
      const hub = yield* RoomHub;
      const first = yield* tags(hub, 'room-1', 1);
      const second = yield* tags(hub, 'room-1', 2);
      yield* Effect.yieldNow;
      assert.strictEqual(yield* hub.activeRooms, 1);

      yield* hub.publish('room-1', { _tag: 'QuizzStarted' });
      assert.deepStrictEqual(yield* Fiber.join(first), ['QuizzStarted']);
      assert.strictEqual(yield* hub.activeRooms, 1);

      yield* hub.publish('room-1', { _tag: 'EndQuizz' });
      assert.deepStrictEqual(yield* Fiber.join(second), ['QuizzStarted', 'EndQuizz']);
      assert.strictEqual(yield* hub.activeRooms, 0);
    }).pipe(Effect.provide(RoomHub.layer)),
  );

  it.effect('releases the room when a subscriber is interrupted', () =>
    Effect.gen(function* () {
      const hub = yield* RoomHub;
      const fiber = yield* tags(hub, 'room-1', 1);
      yield* Effect.yieldNow;
      assert.strictEqual(yield* hub.activeRooms, 1);
      yield* Fiber.interrupt(fiber);
      assert.strictEqual(yield* hub.activeRooms, 0);
    }).pipe(Effect.provide(RoomHub.layer)),
  );

  it.effect('delivers events to a room subscribed again after being released', () =>
    Effect.gen(function* () {
      const hub = yield* RoomHub;
      const before = yield* tags(hub, 'room-1', 1);
      yield* Effect.yieldNow;
      yield* hub.publish('room-1', { _tag: 'QuizzStarted' });
      yield* Fiber.join(before);

      const after = yield* tags(hub, 'room-1', 1);
      yield* Effect.yieldNow;
      yield* hub.publish('room-1', { _tag: 'EndQuizz' });
      assert.deepStrictEqual(yield* Fiber.join(after), ['EndQuizz']);
    }).pipe(Effect.provide(RoomHub.layer)),
  );
});
