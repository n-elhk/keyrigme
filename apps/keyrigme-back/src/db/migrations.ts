import { Array as Arr, Effect } from 'effect';
import { Migrator, SqlClient } from 'effect/sql';
import type { QuestionWithoutId } from '@keyrigme/models';
import { SEED_QUESTIONS } from './seed';

/** Common fields go to their own column, the ones specific to the type to `content`. */
const toQuestionRow = ({ title, type, point, timer, categories, answer, ...content }: QuestionWithoutId) => ({
  title,
  type,
  point,
  timerMs: timer,
  categories,
  // jsonb parameters are sent as JSON text: arrays would otherwise be turned into Postgres arrays.
  content: JSON.stringify(content),
  answer: JSON.stringify(answer),
});

export const migrations = Migrator.fromRecord({
  '0001_init': Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      CREATE TABLE questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        type text NOT NULL CHECK (type IN ('Text', 'Media', 'Order')),
        point integer NOT NULL DEFAULT 3,
        timer_ms integer NOT NULL DEFAULT 10000,
        categories text[] NOT NULL DEFAULT '{}',
        -- Fields specific to the question type: mediaType and files for Media, items for Order.
        content jsonb NOT NULL DEFAULT '{}',
        -- A string, or the ordered item ids for Order.
        answer jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
    yield* sql`CREATE INDEX questions_categories_idx ON questions USING gin (categories)`;
    yield* sql`
      CREATE TABLE rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'Initial'
          CHECK (status IN ('Initial', 'Started', 'Review', 'Ended')),
        owner_player_id uuid NOT NULL,
        no_of_players integer NOT NULL DEFAULT 10,
        no_of_rounds integer NOT NULL DEFAULT 5,
        categories text[] NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
    yield* sql`
      CREATE TABLE room_players (
        room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
        player_id uuid NOT NULL,
        username text NOT NULL,
        avatar text NOT NULL,
        session_token text NOT NULL UNIQUE,
        bonus_points integer NOT NULL DEFAULT 0,
        joined_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (room_id, player_id)
      )`;
    yield* sql`
      CREATE TABLE room_questions (
        room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
        position integer NOT NULL,
        question_id uuid NOT NULL REFERENCES questions (id),
        PRIMARY KEY (room_id, position)
      )`;
    yield* sql`
      CREATE TABLE answers (
        room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
        question_id uuid NOT NULL REFERENCES questions (id),
        player_id uuid NOT NULL,
        -- PlayerResponse: a string, or the ordered item ids for Order.
        response jsonb NOT NULL DEFAULT '""',
        point real NOT NULL DEFAULT 0,
        PRIMARY KEY (room_id, question_id, player_id)
      )`;
  }),
  '0002_seed_questions': Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO questions ${sql.insert(Arr.map(SEED_QUESTIONS, toQuestionRow))}`;
  }),
  '0003_rooms_answers_revealed': Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    // Set once the owner reveals the answers: players can no longer send any answer from then on.
    yield* sql`ALTER TABLE rooms ADD COLUMN answers_revealed boolean NOT NULL DEFAULT false`;
  }),
  '0004_rooms_current_round': Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    // Position of the round being played, so that a game interrupted by a server restart can resume.
    yield* sql`ALTER TABLE rooms ADD COLUMN current_round integer NOT NULL DEFAULT 0`;
  }),
});
