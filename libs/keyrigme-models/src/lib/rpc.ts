import { Context, Schema } from 'effect';
import { Rpc, RpcGroup, RpcMiddleware } from 'effect/rpc';
import {
  Forbidden,
  GameAlreadyStarted,
  InvalidState,
  RoomFull,
  RoomNotFound,
  Unauthorized,
} from './schemas/errors.schema';
import { RoomEvent } from './schemas/events.schema';
import { PlayerResponse } from './schemas/question.schema';
import { Answers, Room, RoomConfig, Uuid } from './schemas/room.schema';

/** Header carrying the session token returned by CreateRoom / JoinRoom. */
export const SESSION_HEADER = 'x-session-token';

/** Player resolved from the session token; a session is bound to a single room. */
export class CurrentPlayer extends Context.Service<
  CurrentPlayer,
  { readonly roomId: string; readonly playerId: string }
>()('@keyrigme/models/CurrentPlayer') {}

export class SessionAuth extends RpcMiddleware.Service<SessionAuth, { provides: CurrentPlayer }>()(
  'SessionAuth',
  { error: Unauthorized },
) {}

export const Session = Schema.Struct({
  room: Room,
  playerId: Schema.String,
  sessionToken: Schema.String,
});
export type Session = typeof Session.Type;

/** What ResumeSession returns: the caller already holds the session token. */
export const ResumedSession = Schema.Struct({
  room: Room,
  playerId: Schema.String,
});
export type ResumedSession = typeof ResumedSession.Type;

const Identity = {
  username: Schema.NonEmptyString,
  avatar: Schema.NonEmptyString,
};

const PublicRpcs = RpcGroup.make(
  Rpc.make('CreateRoom', { payload: Identity, success: Session }),
  Rpc.make('JoinRoom', {
    payload: { code: Schema.NonEmptyString, ...Identity },
    success: Session,
    error: Schema.Union([RoomNotFound, GameAlreadyStarted, RoomFull]),
  }),
);

const SessionRpcs = RpcGroup.make(
  /** Returns the caller's room, so that a client can get back into it after a page reload. */
  Rpc.make('ResumeSession', { success: ResumedSession }),
  /** Stream of every event of the caller's room. */
  Rpc.make('SubscribeRoom', { success: RoomEvent, stream: true }),
  Rpc.make('UpdateRoomConfig', {
    payload: RoomConfig,
    error: Schema.Union([Forbidden, InvalidState]),
  }),
  Rpc.make('StartQuizz', { error: Schema.Union([Forbidden, InvalidState]) }),
  Rpc.make('PlayerAnswer', {
    payload: { questionId: Uuid, response: PlayerResponse },
    error: InvalidState,
  }),
  Rpc.make('ShowAnswers', { error: Schema.Union([Forbidden, InvalidState]) }),
  Rpc.make('SetUserPoints', {
    payload: { answers: Answers },
    error: Schema.Union([Forbidden, InvalidState]),
  }),
  Rpc.make('ChangeIndexAnswers', {
    payload: { index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)) },
    error: Schema.Union([Forbidden, InvalidState]),
  }),
  /** Once the results are shown: brings the room back to the lobby, same players and config, for a new game. */
  Rpc.make('ReplayQuizz', { error: Schema.Union([Forbidden, InvalidState]) }),
  /** Lobby only: once the game has started, every player stays in it until the results. */
  Rpc.make('RemovePlayer', {
    payload: { playerId: Uuid },
    error: Schema.Union([Forbidden, InvalidState]),
  }),
  /** In the lobby or once the results are shown. Does nothing for the owner, who keeps the room. */
  Rpc.make('LeaveRoom', { error: InvalidState }),
).middleware(SessionAuth);

export class QuizzRpcs extends PublicRpcs.merge(SessionRpcs) {}
