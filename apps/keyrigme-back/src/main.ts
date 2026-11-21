import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { QuizzRpcs } from '@keyrigme/models';
import { Effect, Layer } from 'effect';
import { HttpRouter } from 'effect/http';
import { RpcSerialization, RpcServer } from 'effect/rpc';
import { createServer } from 'node:http';
import { ServerConfig } from './config';
import { DatabaseLive } from './db/Database';
import { ApiRoutes } from './http/QuizzApiLive';
import { QuestionRepository } from './repositories/QuestionRepository';
import { RoomRepository } from './repositories/RoomRepository';
import { QuizzHandlers } from './rpc/QuizzHandlers';
import { SessionAuthLive } from './rpc/SessionAuthLive';
import { GameRecovery } from './services/GameRecovery';
import { QuizzRunner } from './services/QuizzRunner';
import { RoomHub } from './services/RoomHub';

const RpcRoute = RpcServer.layerHttp({ group: QuizzRpcs, path: '/rpc', protocol: 'websocket' }).pipe(
  Layer.provide([QuizzHandlers, SessionAuthLive, RpcSerialization.layerJson]),
);

const Repositories = Layer.mergeAll(RoomRepository.layer, QuestionRepository.layer).pipe(
  Layer.provide(DatabaseLive),
);

const Services = GameRecovery.pipe(
  Layer.provideMerge(QuizzRunner.layer),
  Layer.provideMerge(RoomHub.layer),
  Layer.provideMerge(Repositories),
);

const HttpLive = Layer.unwrap(
  Effect.gen(function* () {
    const { port, corsOrigins } = yield* ServerConfig;
    const routes = Layer.mergeAll(ApiRoutes, RpcRoute, HttpRouter.cors({ allowedOrigins: corsOrigins }));
    return HttpRouter.serve(routes).pipe(Layer.provide(NodeHttpServer.layer(createServer, { port })));
  }),
);

HttpLive.pipe(Layer.provide(Services), Layer.launch, NodeRuntime.runMain);
