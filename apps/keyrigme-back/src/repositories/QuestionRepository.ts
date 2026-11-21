import { Question, type CategoryReferentiel, type IQuestion, type QuestionTypesValues } from '@keyrigme/models';
import { Context, Effect, Layer, Schema } from 'effect';
import { SqlClient } from 'effect/sql';

interface QuestionRow {
  readonly id: string;
  readonly title: string;
  readonly type: QuestionTypesValues;
  readonly point: number;
  readonly timerMs: number;
  readonly categories: ReadonlyArray<string>;
  /** Fields specific to the question type. */
  readonly content: Record<string, unknown>;
  readonly answer: unknown;
}

const decodeQuestion = Schema.decodeUnknownEffect(Question);

/** Rebuilds the question from its row; the jsonb columns are checked against the shared schema. */
const toQuestion = ({ timerMs, content, ...row }: QuestionRow) =>
  decodeQuestion({ ...content, ...row, timer: timerMs });

export class QuestionRepository extends Context.Service<
  QuestionRepository,
  {
    getRandom(size: number, categories: ReadonlyArray<string>): Effect.Effect<ReadonlyArray<IQuestion>>;
    /** Returns the questions in the order of `ids`. */
    findByIds(ids: ReadonlyArray<string>): Effect.Effect<ReadonlyArray<IQuestion>>;
    readonly countByCategory: Effect.Effect<ReadonlyArray<CategoryReferentiel>>;
  }
>()('@keyrigme/back/QuestionRepository') {
  static readonly layer = Layer.effect(
    QuestionRepository,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const columns = sql`id, title, type, point, timer_ms, categories, content, answer`;

      const getRandom = Effect.fn('QuestionRepository.getRandom')(
        function* (size: number, categories: ReadonlyArray<string>) {
          const filter = categories.length > 0 ? sql`WHERE categories && ${categories}::text[]` : sql``;
          const rows = yield* sql<QuestionRow>`
            SELECT ${columns} FROM questions ${filter} ORDER BY random() LIMIT ${size}`;
          return yield* Effect.forEach(rows, toQuestion);
        },
        Effect.orDie,
      );

      const findByIds = Effect.fn('QuestionRepository.findByIds')(
        function* (ids: ReadonlyArray<string>) {
          if (ids.length === 0) return [];
          const rows = yield* sql<QuestionRow>`
            SELECT ${columns} FROM questions
            JOIN unnest(${ids}::uuid[]) WITH ORDINALITY AS wanted (id, position) USING (id)
            ORDER BY wanted.position`;
          return yield* Effect.forEach(rows, toQuestion);
        },
        Effect.orDie,
      );

      const countByCategory = sql<CategoryReferentiel>`
        SELECT category AS id, count(*)::int AS count
        FROM questions, unnest(categories) AS category
        GROUP BY category`.pipe(Effect.orDie, Effect.withSpan('QuestionRepository.countByCategory'));

      return QuestionRepository.of({ getRandom, findByIds, countByCategory });
    }),
  );
}
