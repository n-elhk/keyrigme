import { KeyrigmeApi } from '@keyrigme/models';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { QuestionRepository } from '../repositories/QuestionRepository';

const QuizzGroupLive = HttpApiBuilder.group(
  KeyrigmeApi,
  'quizz',
  Effect.fn(function* (handlers) {
    const questions = yield* QuestionRepository;
    return handlers.handle('countByCategory', () => questions.countByCategory);
  }),
);

export const ApiRoutes = HttpApiBuilder.layer(KeyrigmeApi).pipe(Layer.provide(QuizzGroupLive));
