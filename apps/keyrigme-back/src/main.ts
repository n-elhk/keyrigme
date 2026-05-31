/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>('corsOrigins');
  const port = configService.get<number>('port')!;

  app.setGlobalPrefix('api');
  app.enableCors({ origin: corsOrigins });

  await app.listen(port, '0.0.0.0');
  Logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
