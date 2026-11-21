import { isOrderQuestion, toPublicQuestion, type IPublicQuestion, type IQuestion } from '@keyrigme/models';
import { Context, Duration, Effect, FiberMap, Layer, Random } from 'effect';
import { RoomRepository } from '../repositories/RoomRepository';
import { RoomHub } from './RoomHub';

/**
 * Question as broadcast to the players: without its answer, and with the cards of an
 * `Order` question shuffled, since they are stored in the right order.
 */
export const toRound = Effect.fn('QuizzRunner.toRound')(function* (question: IQuestion) {
  const round = toPublicQuestion(question);
  if (!isOrderQuestion(round) || round.items.length < 2) return round;
  const items = yield* Random.shuffle(round.items);
  // Never hand out the solution: rotate the cards if the shuffle left them in order.
  const solved = items.every((item, index) => item.id === round.items[index].id);
  return { ...round, items: solved ? [...items.slice(1), items[0]] : items } satisfies IPublicQuestion;
});

/**
 * Paces the rounds of each running game in its own fiber:
 * each question is broadcast, then stays open for its own `timer`.
 * When the last one expires, the room goes to review.
 * The round being played is saved, so that `start` can resume a game from it after a server restart.
 */
export class QuizzRunner extends Context.Service<
  QuizzRunner,
  {
    /** Plays the game from `fromRound` (the first round by default). */
    start(roomId: string, questions: ReadonlyArray<IQuestion>, fromRound?: number): Effect.Effect<void>;
    stop(roomId: string): Effect.Effect<void>;
  }
>()('@keyrigme/back/QuizzRunner') {
  static readonly layer = Layer.effect(
    QuizzRunner,
    Effect.gen(function* () {
      const hub = yield* RoomHub;
      const rooms = yield* RoomRepository;
      const running = yield* FiberMap.make<string>();

      const play = (roomId: string, questions: ReadonlyArray<IQuestion>, fromRound: number) =>
        Effect.gen(function* () {
          for (const [round, question] of questions.entries()) {
            if (round < fromRound) continue;
            yield* rooms.setCurrentRound(roomId, round);
            yield* hub.publish(roomId, { _tag: 'NewRoundData', question: yield* toRound(question) });
            yield* Effect.sleep(Duration.millis(question.timer));
          }
          yield* rooms.passInReview(roomId);
          yield* hub.publish(roomId, { _tag: 'EndQuizz' });
        }).pipe(
          Effect.annotateLogs({ roomId }),
          Effect.withSpan('QuizzRunner.play', { attributes: { roomId } }),
        );

      return QuizzRunner.of({
        start: (roomId, questions, fromRound = 0) =>
          FiberMap.run(running, roomId, play(roomId, questions, fromRound)).pipe(
            Effect.tap(() => Effect.logInfo(`${questions.length - fromRound} questions scheduled`)),
            Effect.annotateLogs({ roomId }),
            Effect.asVoid,
          ),
        stop: (roomId) => FiberMap.remove(running, roomId),
      });
    }),
  );
}
