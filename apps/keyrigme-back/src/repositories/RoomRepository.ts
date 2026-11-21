import {
  CATEGORIES_VALUES,
  GameAlreadyStarted,
  RoomFull,
  RoomNotFound,
  RoomStatus,
  type Answers,
  type Answer,
  type IRoom,
  type Player,
  type PlayerResponse,
  type RoomConfig,
  type RoomStatusTypesValues,
} from '@keyrigme/models';
import { Array as Arr, Context, Effect, Layer, Option } from 'effect';
import { SqlClient } from 'effect/sql';
import { randomUUID } from 'node:crypto';

export type Identity = Omit<Player, 'playerId'>;

export interface Membership {
  readonly roomId: string;
  readonly playerId: string;
  readonly sessionToken: string;
}

export interface RoomMeta {
  readonly id: string;
  readonly status: RoomStatusTypesValues;
  readonly ownerPlayerId: string;
  readonly noOfRounds: number;
  readonly categories: ReadonlyArray<string>;
}

/** A game that was running: its drawn questions in order and the round being played. */
export interface RunningGame {
  readonly roomId: string;
  readonly currentRound: number;
  readonly questionIds: ReadonlyArray<string>;
}

type RoomRow = Omit<IRoom, 'owner' | 'players' | 'questions' | 'answers' | 'bonus'> & {
  readonly ownerPlayerId: string;
};
type PlayerRow = Player & { readonly bonusPoints: number };
type AnswerRow = Answer & { readonly questionId: string; readonly playerId: string };

export class RoomRepository extends Context.Service<
  RoomRepository,
  {
    /** Creates a room and registers its owner as first player. */
    create(owner: Identity): Effect.Effect<Membership>;
    /** Adds a player to the room identified by `code`, enforcing status and capacity atomically. */
    join(
      code: string,
      player: Identity,
    ): Effect.Effect<Membership & { readonly player: Player }, RoomNotFound | GameAlreadyStarted | RoomFull>;
    findSession(token: string): Effect.Effect<Option.Option<{ roomId: string; playerId: string }>>;
    findMeta(roomId: string): Effect.Effect<Option.Option<RoomMeta>>;
    findView(roomId: string): Effect.Effect<Option.Option<IRoom>>;
    /** Updates the config of a room still in `Initial`. Returns false if the room is not in that status. */
    updateConfig(roomId: string, config: RoomConfig): Effect.Effect<boolean>;
    /** Moves `Initial` -> `Started` and stores the drawn questions with an empty answer per player. */
    start(roomId: string, questionIds: ReadonlyArray<string>): Effect.Effect<boolean>;
    /**
     * Stores a player's answer while the room is `Started`. In `Review`, only the answer to the last question
     * is accepted, and only until the answers are revealed.
     */
    setAnswer(roomId: string, questionId: string, playerId: string, response: PlayerResponse): Effect.Effect<boolean>;
    /** Closes the answers of a room in `Review` or `Ended`, before they are sent to the players. */
    revealAnswers(roomId: string): Effect.Effect<boolean>;
    passInReview(roomId: string): Effect.Effect<void>;
    /** Saves the position of the round being played in a `Started` room. */
    setCurrentRound(roomId: string, round: number): Effect.Effect<void>;
    /** Games still `Started`, e.g. left by a server restart. */
    readonly findRunning: Effect.Effect<ReadonlyArray<RunningGame>>;
    /** Stores the points given by the owner and moves `Review` -> `Ended`. */
    setPointsAndEnd(roomId: string, answers: Answers): Effect.Effect<boolean>;
    /**
     * Moves `Ended` -> `Initial` for a new game with the same players and config:
     * the drawn questions, the answers and the bonus points of the previous game are dropped.
     */
    reset(roomId: string): Effect.Effect<boolean>;
    /**
     * Removes a player from a room in `Initial` or `Ended`. Returns false if they are not in it or a game is running.
     * Their answers to an ended game are kept.
     */
    removePlayer(roomId: string, playerId: string): Effect.Effect<boolean>;
  }
>()('@keyrigme/back/RoomRepository') {
  static readonly layer = Layer.effect(
    RoomRepository,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const insertPlayer = (roomId: string, playerId: string, player: Identity) => {
        const sessionToken = randomUUID();
        return sql`INSERT INTO room_players ${sql.insert({
          roomId,
          playerId,
          username: player.username,
          avatar: player.avatar,
          sessionToken,
        })}`.pipe(Effect.as({ roomId, playerId, sessionToken }));
      };

      const create = Effect.fn('RoomRepository.create')(
        function* (owner: Identity) {
          const playerId = randomUUID();
          const [room] = yield* sql<{ id: string }>`
            INSERT INTO rooms ${sql.insert({ code: randomUUID(), ownerPlayerId: playerId, categories: CATEGORIES_VALUES })}
            RETURNING id`;
          return yield* insertPlayer(room.id, playerId, owner);
        },
        sql.withTransaction,
        Effect.orDie,
      );

      const join = Effect.fn('RoomRepository.join')(
        function* (code: string, player: Identity) {
          const rooms = yield* sql<{ id: string; status: RoomStatusTypesValues; noOfPlayers: number }>`
            SELECT id, status, no_of_players FROM rooms WHERE code = ${code} FOR UPDATE`;
          const room = Arr.head(rooms);
          if (Option.isNone(room)) return yield* new RoomNotFound();
          if (room.value.status !== RoomStatus.Initial) return yield* new GameAlreadyStarted();
          const [{ count }] = yield* sql<{ count: number }>`
            SELECT count(*)::int AS count FROM room_players WHERE room_id = ${room.value.id}`;
          if (count >= room.value.noOfPlayers) return yield* new RoomFull();
          const playerId = randomUUID();
          const membership = yield* insertPlayer(room.value.id, playerId, player);
          return { ...membership, player: { ...player, playerId } };
        },
        sql.withTransaction,
        Effect.catchTag('SqlError', Effect.die),
      );

      const findSession = (token: string) =>
        sql<{ roomId: string; playerId: string }>`
          SELECT room_id, player_id FROM room_players WHERE session_token = ${token}`.pipe(
          Effect.map(Arr.head),
          Effect.orDie,
        );

      const findMeta = (roomId: string) =>
        sql<RoomMeta>`
          SELECT id, status, owner_player_id, no_of_rounds, categories FROM rooms WHERE id = ${roomId}`.pipe(
          Effect.map(Arr.head),
          Effect.orDie,
        );

      const findView = Effect.fn('RoomRepository.findView')(
        function* (roomId: string) {
          const rooms = yield* sql<RoomRow>`
            SELECT id, code, status, owner_player_id, no_of_players, no_of_rounds, categories
            FROM rooms WHERE id = ${roomId}`;
          const row = Arr.head(rooms);
          if (Option.isNone(row)) return Option.none<IRoom>();
          const [players, questions, answers] = yield* Effect.all(
            [
              sql<PlayerRow>`
                SELECT player_id, username, avatar, bonus_points FROM room_players
                WHERE room_id = ${roomId} ORDER BY joined_at`,
              sql<{ questionId: string }>`
                SELECT question_id FROM room_questions WHERE room_id = ${roomId} ORDER BY position`,
              sql<AnswerRow>`
                SELECT question_id, player_id, response, point FROM answers WHERE room_id = ${roomId}`,
            ],
            { concurrency: 'unbounded' },
          );
          const { ownerPlayerId, ...room } = row.value;
          const toPlayer = ({ playerId, username, avatar }: PlayerRow): Player => ({ playerId, username, avatar });
          const owner = players.find((p) => p.playerId === ownerPlayerId);
          const answersByQuestion: Record<string, Record<string, Answer>> = {};
          for (const { questionId, playerId, response, point } of answers) {
            (answersByQuestion[questionId] ??= {})[playerId] = { response, point };
          }
          return Option.some<IRoom>({
            ...room,
            // The owner may have left the room: keep a placeholder so the contract stays valid.
            owner: owner ? toPlayer(owner) : { playerId: ownerPlayerId, username: '', avatar: '' },
            players: players.map(toPlayer),
            questions: questions.map((q) => q.questionId),
            answers: answersByQuestion,
            bonus: Object.fromEntries(players.map((p) => [p.playerId, { point: p.bonusPoints }])),
          });
        },
        Effect.orDie,
      );

      const updateConfig = (roomId: string, config: RoomConfig) =>
        sql`
          UPDATE rooms SET no_of_players = ${config.noOfPlayers}, no_of_rounds = ${config.noOfRounds},
            categories = ${config.categories}::text[], updated_at = now()
          WHERE id = ${roomId} AND status = ${RoomStatus.Initial}
          RETURNING id`.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
        );

      const start = Effect.fn('RoomRepository.start')(
        function* (roomId: string, questionIds: ReadonlyArray<string>) {
          const updated = yield* sql`
            UPDATE rooms SET status = ${RoomStatus.Started}, updated_at = now()
            WHERE id = ${roomId} AND status = ${RoomStatus.Initial} RETURNING id`;
          if (updated.length === 0) return false;
          if (!Arr.isReadonlyArrayNonEmpty(questionIds)) return true;
          yield* sql`INSERT INTO room_questions ${sql.insert(
            Arr.map(questionIds, (questionId, position) => ({ roomId, position, questionId })),
          )}`;
          yield* sql`
            INSERT INTO answers (room_id, question_id, player_id)
            SELECT ${roomId}, q.question_id, p.player_id
            FROM room_questions q CROSS JOIN room_players p
            WHERE q.room_id = ${roomId} AND p.room_id = ${roomId}`;
          return true;
        },
        sql.withTransaction,
        Effect.orDie,
      );

      const setAnswer = (roomId: string, questionId: string, playerId: string, response: PlayerResponse) =>
        sql`
          UPDATE answers a SET response = ${JSON.stringify(response)}::jsonb
          FROM rooms r
          WHERE a.room_id = r.id AND r.id = ${roomId}
            AND a.question_id = ${questionId} AND a.player_id = ${playerId}
            AND (
              r.status = ${RoomStatus.Started}
              -- The answer to the last question is sent on EndQuizz, once the room is already in review.
              -- It must not be accepted once the answers have been revealed.
              OR (
                r.status = ${RoomStatus.Review}
                AND NOT r.answers_revealed
                AND a.question_id = (
                  SELECT q.question_id FROM room_questions q
                  WHERE q.room_id = r.id ORDER BY q.position DESC LIMIT 1
                )
              )
            )
          RETURNING a.player_id`.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
        );

      const revealAnswers = (roomId: string) =>
        sql`
          UPDATE rooms SET answers_revealed = true, updated_at = now()
          WHERE id = ${roomId} AND status IN (${RoomStatus.Review}, ${RoomStatus.Ended})
          RETURNING id`.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
        );

      const passInReview = (roomId: string) =>
        sql`
          UPDATE rooms SET status = ${RoomStatus.Review}, updated_at = now()
          WHERE id = ${roomId} AND status = ${RoomStatus.Started}`.pipe(Effect.asVoid, Effect.orDie);

      const setCurrentRound = (roomId: string, round: number) =>
        sql`
          UPDATE rooms SET current_round = ${round}, updated_at = now()
          WHERE id = ${roomId} AND status = ${RoomStatus.Started}`.pipe(Effect.asVoid, Effect.orDie);

      const findRunning = sql<RunningGame>`
        SELECT r.id AS room_id, r.current_round,
          coalesce(
            array_agg(q.question_id::text ORDER BY q.position) FILTER (WHERE q.question_id IS NOT NULL),
            '{}'
          ) AS question_ids
        FROM rooms r LEFT JOIN room_questions q ON q.room_id = r.id
        WHERE r.status = ${RoomStatus.Started}
        GROUP BY r.id`.pipe(Effect.orDie, Effect.withSpan('RoomRepository.findRunning'));

      const setPointsAndEnd = Effect.fn('RoomRepository.setPointsAndEnd')(
        function* (roomId: string, answers: Answers) {
          const updated = yield* sql`
            UPDATE rooms SET status = ${RoomStatus.Ended}, updated_at = now()
            WHERE id = ${roomId} AND status = ${RoomStatus.Review} RETURNING id`;
          if (updated.length === 0) return false;
          const points = Object.entries(answers).flatMap(([questionId, byPlayer]) =>
            Object.entries(byPlayer).map(([playerId, { point }]) => ({ questionId, playerId, point })),
          );
          yield* Effect.forEach(
            points,
            ({ questionId, playerId, point }) => sql`
              UPDATE answers SET point = ${point}
              WHERE room_id = ${roomId} AND question_id = ${questionId} AND player_id = ${playerId}`,
            { discard: true },
          );
          return true;
        },
        sql.withTransaction,
        Effect.orDie,
      );

      const reset = Effect.fn('RoomRepository.reset')(
        function* (roomId: string) {
          const updated = yield* sql`
            UPDATE rooms SET status = ${RoomStatus.Initial}, answers_revealed = false, current_round = 0,
              updated_at = now()
            WHERE id = ${roomId} AND status = ${RoomStatus.Ended} RETURNING id`;
          if (updated.length === 0) return false;
          yield* sql`DELETE FROM answers WHERE room_id = ${roomId}`;
          yield* sql`DELETE FROM room_questions WHERE room_id = ${roomId}`;
          yield* sql`UPDATE room_players SET bonus_points = 0 WHERE room_id = ${roomId}`;
          return true;
        },
        sql.withTransaction,
        Effect.orDie,
      );

      const removePlayer = (roomId: string, playerId: string) =>
        sql`
          DELETE FROM room_players p USING rooms r
          WHERE p.room_id = r.id AND r.id = ${roomId} AND p.player_id = ${playerId}
            -- Checked here too: the game may start between the handler's check and this delete.
            AND r.status IN (${RoomStatus.Initial}, ${RoomStatus.Ended})
          RETURNING p.player_id`.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
        );

      return RoomRepository.of({
        create,
        join,
        findSession,
        findMeta,
        findView,
        updateConfig,
        start,
        setAnswer,
        revealAnswers,
        passInReview,
        setCurrentRound,
        findRunning,
        setPointsAndEnd,
        reset,
        removePlayer,
      });
    }),
  );
}
