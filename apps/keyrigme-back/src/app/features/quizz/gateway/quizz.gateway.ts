import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { QuestionService } from '../services/question.service';
import {
  Answers,
  Player,
  QuizzEventName,
  RoomStatus,
} from '@keyrigme/keyrigme-models';

import {
  QuizzProducerService,
  QuestionProducer,
} from '../services/quizz-producer.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  UpdateRoomConfigDto,
  updateRoomConfigSchema,
} from '../validators/room-config-validator';
import { randomUUID } from 'node:crypto';

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000', 'http://localhost:4200'] },
})
export class QuizzGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server = new Server();

  constructor(
    private readonly roomService: RoomService,
    private readonly questionService: QuestionService,
    private readonly quizzProducerService: QuizzProducerService,
  ) {}

  async onModuleInit() { /* empty */ }

  async handleConnection(socket: Socket) {
    try {
      return this.server.to(socket.id).emit('rooms', {});
    } catch {
      return this.disconnect(socket);
    }
  }

  async handleDisconnect(socket: Socket) {
    // remove connection from DB
    // await this.connectedUserService.deleteBySocketId(socket.id);
    socket.disconnect();
  }

  private disconnect(socket: Socket) {
    socket.emit('Error', new UnauthorizedException());
    socket.disconnect();
  }

  @SubscribeMessage(QuizzEventName.CreateRoom)
  async onCreateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: Omit<Player, 'sokeId'>,
  ) {
    const { avatar, username } = data;
    const newRoom = await this.roomService.create({
      code: randomUUID(),
      owner: { username, socketId: socket.id, avatar },
      players: [{ socketId: socket.id, username, avatar }],
    });

    this.server.to(socket.id).socketsJoin(newRoom._id.toString());

    this.server // send to all other sockets
      .to(newRoom._id.toString())
      .emit(QuizzEventName.RoomCreated, newRoom);
  }

  @SubscribeMessage(QuizzEventName.JoinRoom)
  async onJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { code: string; username: string; avatar: string },
  ) {
    const { code, username, avatar } = data;
    const room = await this.roomService.findOneByCode(code);

    if (!room) {
      // Assuming that you already checked in router that gameroom exists
      // Then, if a room doesn't exist here, return an error to inform the client-side.
      this.server.emit(QuizzEventName.Error, { error: 'Room doesnt exist.' });
      return;
    }

    // check if there is empty seat in the game room
    if (room.status !== RoomStatus.Initial) {
      this.server
        .to(socket.id)
        .emit(QuizzEventName.Error, { error: 'Game has already started.' });

      return;
    }

    if (room.noOfPlayers <= room.players.length) {
      this.server
        .to(socket.id)
        .emit('error', { error: 'Room is Full. Try again later' });

      return;
    }

    const updatedRoom = await this.roomService.addPlayer(
      room._id.toString(),
      socket.id,
      { username, avatar },
    );

    // Join the room channel
    this.server
      .to(updatedRoom._id.toString())
      .emit(QuizzEventName.AddPlayer, {
        username,
        socketId: socket.id,
        avatar,
      });

    this.server.to(socket.id).socketsJoin(updatedRoom._id.toString());

    this.server.to(socket.id).emit(QuizzEventName.RoomJoined, updatedRoom);
  }

  @SubscribeMessage(QuizzEventName.UpdateRoomConfig)
  async onConfigRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: UpdateRoomConfigDto,
  ) {
    const parse = updateRoomConfigSchema.safeParse(data);

    if (!parse.success) return;

    const config = parse.data;

    const updatedRoom = await this.roomService.updateRoomConfig(
      config.roomId,
      socket.id,
      config,
    );

    if (updatedRoom) {
      this.server
        .to(updatedRoom._id.toString())
        .emit(QuizzEventName.RoomConfigUpdated, updatedRoom);
    }
  }

  @SubscribeMessage(QuizzEventName.StartQuizz)
  async onStartQuizz(
    @ConnectedSocket() socket: Socket,
    @MessageBody() roomId: string,
  ) {
    const startRoom = await this.roomService.startRoom(roomId, socket.id);

    if (startRoom) {
      const room = await this.roomService.initilizeBonus(
        roomId,
        socket.id,
        startRoom.players,
      );

      if (room) {
        const questions = await this.questionService.getRandomQuestions(
          room.noOfRounds,
        );
        const questionIds = questions.map((q) => q._id.toString());
        const playersIds = room.players.map(({ socketId }) => socketId);

        await this.roomService.addQuestionsToRoom(
          room._id.toString(),
          questionIds,
          playersIds,
        );

        this.server.to(room._id.toString()).emit(QuizzEventName.QuizzStarted);
        this.quizzProducerService.emitQuestionWithDelay(
          room._id.toString(),
          questions,
        );
      }
    } else {
      this.server
        .to(socket.id)
        .emit(QuizzEventName.Error, { error: 'Cannot start quizz' });
    }
  }

  @RabbitSubscribe({
    exchange: 'delayed_exchange',
    routingKey: 'end-quizz',
    queue: 'delayed_end_quizz_queue', // nom de la queue à déclarer/consommer
    queueOptions: {
      durable: true, // rendre la queue "persistante"
    },
  })
  async endQuizzUser(roomId: string) {
    await this.roomService.passRoomInReview(roomId);
    this.server.to(roomId).emit(QuizzEventName.EndQuizz);
  }

  @RabbitSubscribe({
    exchange: 'delayed_exchange',
    routingKey: 'questions',
    queue: 'delayed_questions_queue', // nom de la queue à déclarer/consommer
    queueOptions: {
      durable: true, // rendre la queue "persistante"
    },
  })
  async sendQuestionToUser({ roomId, question }: QuestionProducer) {
    this.server.to(roomId).emit(QuizzEventName.NewRoundData, question);
  }

  @SubscribeMessage(QuizzEventName.PlayerAnswer)
  async onPlayerAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    answer: { roomId: string; response: string; questionId: string },
  ) {
    const room = await this.roomService.findById(answer.roomId);
    if (room) {
      const responseAdded = await this.roomService.setUserAnswer(
        answer.roomId,
        answer.questionId,
        socket.id,
        answer.response,
      );
      if (!responseAdded) {
        console.log('error');
      }
    }
  }

  @SubscribeMessage(QuizzEventName.ShowAnswers)
  async onShowAnswers(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    roomId: string,
  ) {
    const room = await this.roomService.findByIdWithQuestion(roomId, socket.id);

    if (room) {
      this.server
        .to(room._id.toString())
        .emit(QuizzEventName.ShowAnswers, room);
    } else {
      this.server.emit(QuizzEventName.Error, { error: 'toto' });
    }
  }

  @SubscribeMessage(QuizzEventName.SetUserPoints)
  async onSetUserPoints(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: { answers: Answers; roomId: string },
  ) {
    const { roomId, answers } = data;
    const room = await this.roomService.setUserPointsAndEndRoom(
      roomId,
      socket.id,
      answers,
    );

    if (room) {
      this.server.to(room._id.toString()).emit(QuizzEventName.ShowResult, room);
    } else {
      this.server.emit(QuizzEventName.Error, { error: 'toto' });
    }
  }

  @SubscribeMessage(QuizzEventName.ChangeIndexAnswers)
  async onIndexAnswersChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; index: number },
  ) {
    const { roomId, index } = data;

    const room = await this.roomService.findRoomByOwnerInReview(
      roomId,
      socket.id,
    );

    if (room) {
      this.server
        .to(room._id.toString())
        .except(socket.id)
        .emit(QuizzEventName.ChangeIndexAnswers, index);
    } else {
      this.server.emit(QuizzEventName.Error, { error: 'toto' });
    }
  }

  @SubscribeMessage(QuizzEventName.RemovePlayer)
  async onRemovePlayer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const { roomId, playerId } = data;
    console.log('remove player', roomId, socket.id, playerId);
    const room = await this.roomService.removeUser(roomId, socket.id, playerId);

    if (room) {
      this.server
        .to(room._id.toString())
        .emit(QuizzEventName.RemovedPlayer, { socketId: playerId });

      // Emit to the specific player that they have been removed for reloading
      // this.server
      //   .to(playerId)
      //   .emit(QuizzEventName.RemovedPlayer);
    } else {
      this.server.emit(QuizzEventName.Error, { error: 'toto' });
    }
  }

  @SubscribeMessage(QuizzEventName.LeaveRoom)
  async onLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() roomId: string,
  ) {
    const room = await this.roomService.removeOnLeaveUser(roomId, socket.id);

    if (room) {
      this.server
        .to(room._id.toString())
        .emit(QuizzEventName.RemovedPlayer, { socketId: socket.id });
    } else {
      this.server.emit(QuizzEventName.Error, { error: 'toto' });
    }
  }
}
