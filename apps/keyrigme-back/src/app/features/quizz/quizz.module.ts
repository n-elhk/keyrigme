import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { QuizzGateway } from './gateway/quizz.gateway';
import { RoomService } from './services/room.service';
import { Room, RoomSchema } from './schemas/room.schema';
import { QuestionService } from './services/question.service';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuizzProducerService } from './services/quizz-producer.service';
import { rabbitMqOptionsConfig } from '../../../config/rabbit.config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { QuizzController } from './quizz.controller';

@Module({
  imports: [
    RabbitMQModule.forRoot(rabbitMqOptionsConfig()),
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [QuizzController],
  providers: [
    QuizzProducerService,
    QuizzGateway,
    RoomService,
    QuestionService,
  ],
})
export class QuizzModule { }
