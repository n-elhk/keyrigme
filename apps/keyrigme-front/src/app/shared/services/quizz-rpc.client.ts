/**
 * Effect RPC client, loaded lazily so that Effect stays out of the initial bundle.
 * Exposes a Promise / callback API for Angular.
 */
import { DestroyRef, Service, inject } from '@angular/core';
import { QuizzRpcs, SESSION_HEADER, type RoomEvent } from '@keyrigme/models';
import { Cause, Context, Effect, Exit, Fiber, Layer, ManagedRuntime, Schedule, Stream } from 'effect';
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc';
import { Socket } from 'effect/socket';

class QuizzClient extends Context.Service<
  QuizzClient,
  RpcClient.FromGroup<typeof QuizzRpcs, RpcClientError.RpcClientError>
>()('@keyrigme/front/QuizzClient') {}

export type Client = QuizzClient['Service'];
export type RequestOptions = { readonly headers: Record<string, string> };
export type QuizzErrorLike = { readonly _tag: string; readonly message?: string };
export type CallResult<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly error: QuizzErrorLike };

const rpcUrl = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/rpc`;

const QuizzClientLive = Layer.effect(QuizzClient, RpcClient.make(QuizzRpcs)).pipe(
  Layer.provide(RpcClient.layerProtocolSocket({ retryTransientErrors: true })),
  Layer.provide([
    Socket.layerWebSocket(Effect.sync(rpcUrl)).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal)),
    RpcSerialization.layerJson,
  ]),
);

export const sessionHeaders = (token: string): RequestOptions => ({ headers: { [SESSION_HEADER]: token } });

export function createQuizzRpcClient() {
  const runtime = ManagedRuntime.make(QuizzClientLive);

  const withClient = <A, E>(f: (client: Client) => Effect.Effect<A, E>) =>
    Effect.gen(function* () {
      return yield* f(yield* QuizzClient);
    });

  return {
    /** Runs a request; typed failures are returned instead of rejected. */
    call: async <A>(request: (client: Client) => Effect.Effect<A, QuizzErrorLike>): Promise<CallResult<A>> => {
      const exit = await runtime.runPromiseExit(withClient(request));
      if (Exit.isSuccess(exit)) return { ok: true, value: exit.value };
      const error = Exit.findErrorOption(exit);
      if (error._tag === 'Some') return { ok: false, error: error.value };
      throw Cause.squash(exit.cause);
    },
    /**
     * Listens to the events of the session's room until the returned function is called.
     * When the connection drops (e.g. a server restart), subscribes again once it is back;
     * a rejected session (Unauthorized) or any other failure stops it and calls `onError`.
     */
    subscribe: (
      token: string,
      onEvent: (event: RoomEvent) => void,
      onError: () => void,
    ): (() => void) => {
      const fiber = runtime.runFork(
        withClient((client) =>
          client.SubscribeRoom(undefined, sessionHeaders(token)).pipe(
            Stream.runForEach((event) => Effect.sync(() => onEvent(event))),
          ),
        ).pipe(
          Effect.retry({
            schedule: Schedule.spaced('1 second'),
            while: (error) => error._tag === 'RpcClientError',
          }),
          // Skipped on interruption, i.e. when the subscription is stopped on purpose.
          Effect.tapCause((cause) =>
            Effect.sync(() => {
              console.error(Cause.pretty(cause));
              onError();
            }),
          ),
        ),
      );
      return () => void runtime.runFork(Fiber.interrupt(fiber));
    },
    dispose: () => runtime.dispose(),
  };
}

export type QuizzRpcClient = ReturnType<typeof createQuizzRpcClient>;

/** Effect RPC client of the application, injected lazily with `injectAsync` by QuizzRpcService. */
@Service()
export class QuizzRpcConnection {
  readonly rpc = createQuizzRpcClient();
  readonly headers = sessionHeaders;

  constructor() {
    inject(DestroyRef).onDestroy(() => void this.rpc.dispose());
  }
}
