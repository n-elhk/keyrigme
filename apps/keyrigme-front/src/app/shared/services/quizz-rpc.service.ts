import { PLATFORM_ID, Service, inject, injectAsync, onIdle, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Answers, PlayerResponse, RoomConfig, RoomEvent, RoomEventTag, Session } from '@keyrigme/models';

/** Key of the session token in sessionStorage: it survives a reload of the tab, not its closing. */
const SESSION_TOKEN_KEY = 'keyrigme.sessionToken';
import { Observable, Subject, filter } from 'rxjs';
import type { Client, QuizzErrorLike, QuizzRpcClient, RequestOptions } from './quizz-rpc.client';
import type { Effect } from 'effect';

/**
 * Bridge between Angular and the Effect RPC client.
 * Holds the current session (one room at a time) and re-emits the room events as an Observable.
 * The session token is kept in sessionStorage so that a page reload can resume the session.
 * The client (and Effect) is a lazy chunk, prefetched once the browser is idle and never loaded during SSR.
 */
@Service()
export class QuizzRpcService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly connection = injectAsync(
    () => import('./quizz-rpc.client').then((m) => m.QuizzRpcConnection),
    { prefetch: this.isBrowser ? onIdle : undefined },
  );
  private unsubscribe: (() => void) | null = null;

  private readonly session = signal<Session | null>(null);
  private readonly sessionsSubject = new Subject<Session>();
  private readonly resumedSubject = new Subject<Session>();
  private readonly closedSubject = new Subject<void>();
  private readonly lostSubject = new Subject<void>();
  private readonly openingSignal = signal(false);
  private resuming: Promise<boolean> | null = null;
  private readonly eventsSubject = new Subject<RoomEvent>();

  /** Id of the current player, null until a room is created or joined. */
  readonly playerId = signal<string | null>(null);
  /** Last error returned by the server, for display. */
  readonly lastError = signal<QuizzErrorLike | null>(null);

  /** Emits each time a room is created or joined. */
  readonly sessions$ = this.sessionsSubject.asObservable();
  /** Emits when a session is resumed after a page reload. */
  readonly resumed$ = this.resumedSubject.asObservable();
  readonly events$ = this.eventsSubject.asObservable();
  /** Emits each time the current session is closed (room left, player removed, connection lost, new room). */
  readonly closed$ = this.closedSubject.asObservable();
  /** Emits when the room's event stream stops on an error the client cannot recover from. */
  readonly lost$ = this.lostSubject.asObservable();
  /** True while a room is being created or joined. */
  readonly opening = this.openingSignal.asReadonly();

  readonly isItSelf = (playerId: string) => playerId === this.playerId();

  on<T extends RoomEventTag>(tag: T): Observable<Extract<RoomEvent, { _tag: T }>> {
    return this.events$.pipe(filter((event): event is Extract<RoomEvent, { _tag: T }> => event._tag === tag));
  }

  createRoom(username: string, avatar: string) {
    return this.openSession((client) => client.CreateRoom({ username, avatar }));
  }

  joinRoom(code: string, username: string, avatar: string) {
    return this.openSession((client) => client.JoinRoom({ code, username, avatar }));
  }

  updateRoomConfig(config: RoomConfig) {
    return this.call((client, options) => client.UpdateRoomConfig(config, options));
  }

  startQuizz() {
    return this.call((client, options) => client.StartQuizz(undefined, options));
  }

  playerAnswer(questionId: string, response: PlayerResponse) {
    return this.call((client, options) => client.PlayerAnswer({ questionId, response }, options));
  }

  showAnswers() {
    return this.call((client, options) => client.ShowAnswers(undefined, options));
  }

  setUserPoints(answers: Answers) {
    return this.call((client, options) => client.SetUserPoints({ answers }, options));
  }

  replayQuizz() {
    return this.call((client, options) => client.ReplayQuizz(undefined, options));
  }

  indexAnswersChange(index: number) {
    return this.call((client, options) => client.ChangeIndexAnswers({ index }, options));
  }

  removePlayer(playerId: string) {
    return this.call((client, options) => client.RemovePlayer({ playerId }, options));
  }

  /**
   * Gets back into the room of the token saved in this tab, if any. Resolves to true when a session is active.
   * Concurrent calls share the same request.
   */
  resumeSession(): Promise<boolean> {
    if (this.session()) return Promise.resolve(true);
    this.resuming ??= this.resume().finally(() => (this.resuming = null));
    return this.resuming;
  }

  /** Resolves to false when the server refused: the session is then kept. */
  async leaveRoom(): Promise<boolean> {
    const ok = await this.call((client, options) => client.LeaveRoom(undefined, options));
    if (ok) this.closeSession();
    return ok;
  }

  /** Forgets the current session and stops listening to its room. */
  closeSession() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session.set(null);
    this.playerId.set(null);
    this.storeToken(null);
    this.closedSubject.next();
  }

  /** Null during SSR: there is no server to talk to. */
  private getClient() {
    return this.isBrowser ? this.connection() : null;
  }

  private async openSession(open: (client: Client) => Effect.Effect<Session, QuizzErrorLike>) {
    const loading = this.getClient();
    // One room at a time: a second click while the first request is pending is ignored.
    if (!loading || this.openingSignal()) return;
    this.openingSignal.set(true);
    try {
      const { rpc } = await loading;
      this.closeSession();
      this.lastError.set(null);
      const result = await rpc.call(open);
      if (!result.ok) {
        this.lastError.set(result.error);
        return;
      }
      this.activate(rpc, result.value);
      this.sessionsSubject.next(result.value);
    } finally {
      this.openingSignal.set(false);
    }
  }

  private async resume(): Promise<boolean> {
    const sessionToken = this.readToken();
    const loading = this.getClient();
    if (!sessionToken || !loading) return false;
    const { rpc, headers } = await loading;
    const result = await rpc.call((client) => client.ResumeSession(undefined, headers(sessionToken)));
    if (!result.ok) {
      // The session no longer exists (player removed, room gone): forget it.
      this.storeToken(null);
      return false;
    }
    const session = { ...result.value, sessionToken };
    this.activate(rpc, session);
    this.resumedSubject.next(session);
    return true;
  }

  private activate(rpc: QuizzRpcClient, session: Session) {
    this.session.set(session);
    this.playerId.set(session.playerId);
    this.storeToken(session.sessionToken);
    this.unsubscribe = rpc.subscribe(
      session.sessionToken,
      (event) => this.eventsSubject.next(event),
      () => {
        // Ignore a failure of a subscription that was already replaced.
        if (this.session() !== session) return;
        this.unsubscribe = null;
        this.closeSession();
        this.lastError.set({ _tag: 'SessionLost' });
        this.lostSubject.next();
      },
    );
  }

  private readToken(): string | null {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private storeToken(token: string | null) {
    if (!this.isBrowser) return;
    try {
      if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      else sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // Storage unavailable (private mode, blocked site data): the session just won't survive a reload.
    }
  }

  private async call(
    request: (client: Client, options: RequestOptions) => Effect.Effect<void, QuizzErrorLike>,
  ): Promise<boolean> {
    const session = this.session();
    const loading = this.getClient();
    if (!session || !loading) return false;
    const { rpc, headers } = await loading;
    this.lastError.set(null);
    const result = await rpc.call((client) => request(client, headers(session.sessionToken)));
    if (!result.ok) this.lastError.set(result.error);
    return result.ok;
  }
}
