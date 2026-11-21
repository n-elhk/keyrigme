import type { RoomEvent } from '@keyrigme/models';
import { Context, Effect, Layer, PubSub, Stream } from 'effect';

interface RoomChannel {
  readonly pubsub: PubSub.PubSub<RoomEvent>;
  subscribers: number;
}

/**
 * In-process event bus: one PubSub per room, created by its first subscriber
 * and shut down when its last subscriber leaves, so that ended rooms do not stay in memory.
 * Events published while a room has no subscriber are dropped.
 * Single instance only: see todo.md to share the events between several instances.
 */
export class RoomHub extends Context.Service<
  RoomHub,
  {
    publish(roomId: string, event: RoomEvent): Effect.Effect<void>;
    subscribe(roomId: string): Stream.Stream<RoomEvent>;
    /** Number of rooms that currently have at least one subscriber. */
    readonly activeRooms: Effect.Effect<number>;
  }
>()('@keyrigme/back/RoomHub') {
  static readonly layer = Layer.effect(
    RoomHub,
    Effect.gen(function* () {
      const channels = new Map<string, RoomChannel>();

      const join = (roomId: string) =>
        Effect.suspend(() => {
          const existing = channels.get(roomId);
          if (existing) {
            existing.subscribers++;
            return Effect.succeed(existing);
          }
          return Effect.flatMap(PubSub.unbounded<RoomEvent>(), (pubsub) => {
            // Another subscriber may have created the channel meanwhile: join it instead of replacing it.
            const raced = channels.get(roomId);
            if (raced) {
              raced.subscribers++;
              return Effect.as(PubSub.shutdown(pubsub), raced);
            }
            const channel = { pubsub, subscribers: 1 };
            channels.set(roomId, channel);
            return Effect.succeed(channel);
          });
        });

      const leave = (roomId: string, channel: RoomChannel) =>
        Effect.suspend(() => {
          channel.subscribers--;
          if (channel.subscribers > 0 || channels.get(roomId) !== channel) return Effect.void;
          channels.delete(roomId);
          return PubSub.shutdown(channel.pubsub);
        });

      yield* Effect.addFinalizer(() =>
        Effect.forEach(channels.values(), ({ pubsub }) => PubSub.shutdown(pubsub), { discard: true }),
      );

      return RoomHub.of({
        publish: (roomId, event) =>
          Effect.suspend(() => {
            const channel = channels.get(roomId);
            return channel ? PubSub.publish(channel.pubsub, event).pipe(Effect.asVoid) : Effect.void;
          }),
        // The subscription is taken as soon as the stream starts, and released with it
        // (end of the stream, client disconnection or interruption).
        subscribe: (roomId) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const channel = yield* Effect.acquireRelease(join(roomId), (channel) => leave(roomId, channel));
              return Stream.fromSubscription(yield* PubSub.subscribe(channel.pubsub));
            }),
          ),
        activeRooms: Effect.sync(() => channels.size),
      });
    }),
  );
}
