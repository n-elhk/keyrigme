/**
 * End-to-end smoke test of the RPC API against a running server (pnpm dev + docker compose up).
 * Plays a one-round game with two players. Usage: pnpm --filter @keyrigme/back smoke
 */
import { QuizzRpcs, SESSION_HEADER } from '@keyrigme/models';
import { Effect, Fiber, Layer, Stream } from 'effect';
import { RpcClient, RpcSerialization } from 'effect/rpc';
import { Socket } from 'effect/socket';

const Protocol = RpcClient.layerProtocolSocket().pipe(
  Layer.provide([Socket.layerWebSocket(process.env['RPC_URL'] ?? 'ws://localhost:3000/rpc').pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal)), RpcSerialization.layerJson]),
);

const program = Effect.gen(function* () {
  const client = yield* RpcClient.make(QuizzRpcs);
  const owner = yield* client.CreateRoom({ username: 'alice', avatar: 'a.png' });
  const ownerH = { headers: { [SESSION_HEADER]: owner.sessionToken } };
  console.log('created', owner.room.code, owner.room.status);

  const ownerEvents = yield* client.SubscribeRoom(undefined, ownerH).pipe(
    Stream.map((e) => e._tag),
    Stream.takeUntil((tag) => tag === 'ShowResult'),
    Stream.runCollect,
    Effect.forkChild,
  );
  yield* Effect.sleep(200);

  const guest = yield* client.JoinRoom({ code: owner.room.code, username: 'bob', avatar: 'b.png' });
  const guestH = { headers: { [SESSION_HEADER]: guest.sessionToken } };
  console.log('joined, players =', guest.room.players.map((p) => p.username));

  const notOwner = yield* Effect.exit(client.StartQuizz(undefined, guestH));
  console.log('guest StartQuizz ->', notOwner._tag);
  const badJoin = yield* Effect.exit(client.JoinRoom({ code: 'nope', username: 'x', avatar: 'x' }));
  console.log('bad code JoinRoom ->', JSON.stringify(badJoin).includes('RoomNotFound') ? 'RoomNotFound' : badJoin);

  yield* client.UpdateRoomConfig({ noOfPlayers: 4, noOfRounds: 1, categories: ['SAINT'] }, ownerH);
  const guestRounds = yield* client.SubscribeRoom(undefined, guestH).pipe(
    Stream.filter((e) => e._tag === 'NewRoundData'),
    Stream.take(1),
    Stream.runHead,
    Effect.forkChild,
  );
  yield* Effect.sleep(200);
  yield* client.StartQuizz(undefined, ownerH);
  const round = yield* Fiber.join(guestRounds);
  if (round._tag === 'None' || round.value._tag !== 'NewRoundData') throw new Error('no round');
  const q = round.value.question;
  console.log('round:', q.title, 'timer', q.timer, 'category', q.categories);
  yield* client.PlayerAnswer({ questionId: q.id, response: 'Saint Denis' }, guestH);
  const early = yield* Effect.exit(client.ShowAnswers(undefined, ownerH));
  console.log('ShowAnswers before end ->', early._tag);

  yield* Effect.sleep(q.timer + 500);
  yield* client.ShowAnswers(undefined, ownerH);
  yield* client.ChangeIndexAnswers({ index: 0 }, ownerH);
  yield* client.SetUserPoints({ answers: { [q.id]: { [guest.playerId]: { response: 'Saint Denis', point: q.point } } } }, ownerH);
  const tags = yield* Fiber.join(ownerEvents);
  console.log('owner events:', tags.join(' > '));
});

program.pipe(Effect.scoped, Effect.provide(Protocol), Effect.runPromise).then(
  () => process.exit(0),
  (e) => { console.error('FAILED', e); process.exit(1); },
);
