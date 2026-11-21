import { assert, describe, it } from '@effect/vitest';
import type { IQuestion } from '@keyrigme/models';
import { Effect, Fiber, Layer, Ref, Stream } from 'effect';
import { TestClock } from 'effect/testing';
import { RoomRepository } from '../src/repositories/RoomRepository';
import { QuizzRunner, toRound } from '../src/services/QuizzRunner';
import { RoomHub } from '../src/services/RoomHub';

const question = (id: string, timer: number): IQuestion => ({
  id,
  title: id,
  answer: '',
  point: 1,
  timer,
  type: 'Text',
  categories: [],
});

const orderQuestion = (ids: ReadonlyArray<string>): IQuestion => ({
  id: 'order',
  title: 'order',
  point: 1,
  timer: 1_000,
  type: 'Order',
  categories: [],
  items: ids.map((id) => ({ id, label: id, file: '' })),
  answer: ids,
});

describe('toRound', () => {
  it.effect('removes the answer of the question', () =>
    Effect.gen(function* () {
      const round = yield* toRound(question('q1', 1_000));
      assert.isFalse('answer' in round);
    }),
  );

  it.effect('never sends the cards of an Order question in the right order', () =>
    Effect.gen(function* () {
      for (let i = 0; i < 20; i++) {
        const round = yield* toRound(orderQuestion(['a', 'b']));
        assert.isFalse('answer' in round);
        assert.strictEqual(round.type, 'Order');
        if (round.type === 'Order') assert.deepStrictEqual(round.items.map((item) => item.id), ['b', 'a']);
      }
    }),
  );
});

describe('QuizzRunner', () => {
  it.effect('broadcasts each question for its own timer, then ends the quizz', () =>
    Effect.gen(function* () {
      const reviewed = yield* Ref.make<ReadonlyArray<string>>([]);
      const RoomsTest = Layer.mock(RoomRepository, {
        passInReview: (roomId) => Ref.update(reviewed, (ids) => [...ids, roomId]),
        setCurrentRound: () => Effect.void,
      });
      const TestLayer = QuizzRunner.layer.pipe(Layer.provideMerge(RoomHub.layer), Layer.provide(RoomsTest));

      yield* Effect.gen(function* () {
        const hub = yield* RoomHub;
        const runner = yield* QuizzRunner;

        const events = yield* hub.subscribe('room-1').pipe(
          Stream.map((event) => (event._tag === 'NewRoundData' ? `round:${event.question.id}` : event._tag)),
          Stream.take(3),
          Stream.runCollect,
          Effect.forkChild,
        );
        yield* Effect.yieldNow;

        yield* runner.start('room-1', [question('q1', 10_000), question('q2', 5_000)]);

        yield* TestClock.adjust(14_999);
        assert.deepStrictEqual(yield* Ref.get(reviewed), []);

        yield* TestClock.adjust(1);
        assert.deepStrictEqual(yield* Fiber.join(events), ['round:q1', 'round:q2', 'EndQuizz']);
        assert.deepStrictEqual(yield* Ref.get(reviewed), ['room-1']);
      }).pipe(Effect.provide(TestLayer));
    }),
  );

  it.effect('stop interrupts the game before it ends', () =>
    Effect.gen(function* () {
      const reviewed = yield* Ref.make(0);
      const RoomsTest = Layer.mock(RoomRepository, {
        passInReview: () => Ref.update(reviewed, (n) => n + 1),
        setCurrentRound: () => Effect.void,
      });
      const TestLayer = QuizzRunner.layer.pipe(Layer.provideMerge(RoomHub.layer), Layer.provide(RoomsTest));

      yield* Effect.gen(function* () {
        const runner = yield* QuizzRunner;
        yield* runner.start('room-1', [question('q1', 10_000)]);
        yield* runner.stop('room-1');
        yield* TestClock.adjust(60_000);
        assert.strictEqual(yield* Ref.get(reviewed), 0);
      }).pipe(Effect.provide(TestLayer));
    }),
  );

  it.effect('resumes a game from the saved round', () =>
    Effect.gen(function* () {
      const saved = yield* Ref.make<ReadonlyArray<number>>([]);
      const RoomsTest = Layer.mock(RoomRepository, {
        passInReview: () => Effect.void,
        setCurrentRound: (_, round) => Ref.update(saved, (rounds) => [...rounds, round]),
      });
      const TestLayer = QuizzRunner.layer.pipe(Layer.provideMerge(RoomHub.layer), Layer.provide(RoomsTest));

      yield* Effect.gen(function* () {
        const hub = yield* RoomHub;
        const runner = yield* QuizzRunner;

        const events = yield* hub.subscribe('room-1').pipe(
          Stream.map((event) => (event._tag === 'NewRoundData' ? `round:${event.question.id}` : event._tag)),
          Stream.take(3),
          Stream.runCollect,
          Effect.forkChild,
        );
        yield* Effect.yieldNow;

        yield* runner.start('room-1', [question('q1', 1_000), question('q2', 1_000), question('q3', 1_000)], 1);
        yield* TestClock.adjust(2_000);
        assert.deepStrictEqual(yield* Fiber.join(events), ['round:q2', 'round:q3', 'EndQuizz']);
        assert.deepStrictEqual(yield* Ref.get(saved), [1, 2]);
      }).pipe(Effect.provide(TestLayer));
    }),
  );
});
