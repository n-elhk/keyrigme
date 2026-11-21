import { Schema } from 'effect';
import { RoomStatus } from '../constants';
import { PlayerResponse, QuestionCategory } from './question.schema';

/**
 * Id of a player or a question: stored in uuid columns, so anything else must be rejected before the database.
 * Shape-only check, like Postgres: no constraint on the UUID version.
 */
export const Uuid = Schema.String.check(Schema.isGUID());

export const RoomStatusSchema = Schema.Literals(Object.values(RoomStatus));
export type RoomStatusTypesValues = typeof RoomStatusSchema.Type;

export const Player = Schema.Struct({
  playerId: Schema.String,
  username: Schema.String,
  avatar: Schema.String,
});
export type Player = typeof Player.Type;

export const Answer = Schema.Struct({
  response: PlayerResponse,
  point: Schema.Number,
});
export type Answer = typeof Answer.Type;

/** questionId -> playerId -> answer */
export const Answers = Schema.Record(Uuid, Schema.Record(Uuid, Answer));
export type Answers = typeof Answers.Type;

export const Bonus = Schema.Struct({ point: Schema.Number });
export type Bonus = typeof Bonus.Type;

/** playerId -> bonus */
export const UserBonus = Schema.Record(Schema.String, Bonus);
export type UserBonus = typeof UserBonus.Type;

export const RoomConfig = Schema.Struct({
  noOfPlayers: Schema.Int.check(Schema.isGreaterThanOrEqualTo(2)),
  noOfRounds: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  categories: Schema.Array(QuestionCategory),
});
export type RoomConfig = typeof RoomConfig.Type;

export const Room = Schema.Struct({
  id: Schema.String,
  code: Schema.String,
  status: RoomStatusSchema,
  noOfPlayers: Schema.Int,
  noOfRounds: Schema.Int,
  categories: Schema.Array(QuestionCategory),
  owner: Player,
  players: Schema.Array(Player),
  /** Ordered ids of the questions drawn for the game. */
  questions: Schema.Array(Schema.String),
  answers: Answers,
  bonus: UserBonus,
});
export type IRoom = typeof Room.Type;
