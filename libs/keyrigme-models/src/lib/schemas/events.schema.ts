import { Schema } from 'effect';
import { PublicQuestion, Question } from './question.schema';
import { Player, Room } from './room.schema';

/** Events pushed to every player subscribed to a room. */
export const RoomEvent = Schema.Union([
  Schema.TaggedStruct('PlayerAdded', { player: Player }),
  Schema.TaggedStruct('PlayerRemoved', { playerId: Schema.String }),
  Schema.TaggedStruct('RoomConfigUpdated', { room: Room }),
  Schema.TaggedStruct('QuizzStarted', {}),
  Schema.TaggedStruct('NewRoundData', { question: PublicQuestion }),
  Schema.TaggedStruct('EndQuizz', {}),
  /** Carries the full questions of the game, answers included, in the order they were played. */
  Schema.TaggedStruct('ShowAnswers', { room: Room, questions: Schema.Array(Question) }),
  /** Sent by the owner while reviewing answers; `from` lets the sender ignore its own echo. */
  Schema.TaggedStruct('ChangeIndexAnswers', { index: Schema.Int, from: Schema.String }),
  Schema.TaggedStruct('ShowResult', { room: Room }),
  /** The owner started a new game with the same players: everyone goes back to the lobby. */
  Schema.TaggedStruct('QuizzReset', { room: Room }),
]);
export type RoomEvent = typeof RoomEvent.Type;
export type RoomEventTag = RoomEvent['_tag'];
