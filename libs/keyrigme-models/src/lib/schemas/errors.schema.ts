import { Schema } from 'effect';

export class RoomNotFound extends Schema.TaggedError<RoomNotFound>()('RoomNotFound', {}) {}

export class RoomFull extends Schema.TaggedError<RoomFull>()('RoomFull', {}) {}

export class GameAlreadyStarted extends Schema.TaggedError<GameAlreadyStarted>()(
  'GameAlreadyStarted',
  {},
) {}

/** The caller is not allowed to perform this action (not the owner, not in the room...). */
export class Forbidden extends Schema.TaggedError<Forbidden>()('Forbidden', {
  message: Schema.String,
}) {}

/** The room is not in the status required by the action. */
export class InvalidState extends Schema.TaggedError<InvalidState>()('InvalidState', {
  message: Schema.String,
}) {}

/** Missing or unknown session token. */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()('Unauthorized', {}) {}

export type QuizzError =
  | RoomNotFound
  | RoomFull
  | GameAlreadyStarted
  | Forbidden
  | InvalidState
  | Unauthorized;
