import { Duration, Effect, Layer } from 'effect';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { RoomRepository } from '../repositories/RoomRepository';
import { QuizzRunner } from './QuizzRunner';

/**
 * Leaves time to the clients to reconnect after a restart: a round broadcast before they
 * subscribe again would be lost. The RPC client retries the connection at most every 5 seconds.
 */
export const RECOVERY_DELAY = Duration.seconds(10);

/**
 * At startup, resumes the games interrupted by a server restart: rounds are paced in memory, so a game
 * left `Started` would otherwise never end. The interrupted round is played again with its full timer.
 */
export const GameRecovery = Layer.effectDiscard(
  Effect.gen(function* () {
    const rooms = yield* RoomRepository;
    const questions = yield* QuestionRepository;
    const runner = yield* QuizzRunner;

    const games = yield* rooms.findRunning;
    if (games.length === 0) return;
    yield* Effect.logInfo(`Resuming ${games.length} interrupted game(s)`);

    yield* Effect.sleep(RECOVERY_DELAY);
    yield* Effect.forEach(
      games,
      ({ roomId, currentRound, questionIds }) =>
        Effect.flatMap(questions.findByIds(questionIds), (drawn) => runner.start(roomId, drawn, currentRound)),
      { discard: true },
    );
  }).pipe(Effect.forkScoped, Effect.withSpan('GameRecovery')),
);
