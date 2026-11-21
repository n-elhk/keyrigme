import { Schema } from 'effect';
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { CategoryReferentiel } from './schemas/question.schema';

export class QuizzApiGroup extends HttpApiGroup.make('quizz').add(
  HttpApiEndpoint.get('countByCategory', '/count-by-category', {
    success: Schema.Array(CategoryReferentiel),
  }),
).prefix('/quizz') {}

export class KeyrigmeApi extends HttpApi.make('keyrigme').add(QuizzApiGroup).prefix('/api') {}
