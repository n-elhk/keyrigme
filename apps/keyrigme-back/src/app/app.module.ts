import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from '../config/configuration';
import { QuizzModule } from './features/quizz/quizz.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    MongooseModule.forRoot(process.env.DATABASE_HOST),
    QuizzModule,
  ],
})
export class AppModule {}
