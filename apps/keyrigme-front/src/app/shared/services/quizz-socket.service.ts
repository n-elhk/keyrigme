import { inject, Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import type {
  Answers,
  IQuestion,
  IRoom,
  Player,
  RoomConfig,
} from '@keyrigme/keyrigme-models';
import { QuizzEventName } from '@keyrigme/keyrigme-models';

@Injectable({ providedIn: 'root' })
export class QuizzSocketService {
  private readonly socket = inject(Socket);

  readonly isItSelf = (playerId: string) => {
    return playerId === this.getSocketId()
  }

  createRoom(username: string, avatar: string): void {
    this.socket.emit(QuizzEventName.CreateRoom, { username, avatar });
  }

  getSocketId() {
    return this.socket.ioSocket.id as string;
  }

  joinRoom(code: string, username: string, avatar: string): void {
    this.socket.emit(QuizzEventName.JoinRoom, { code, username, avatar });
  }

  leaveRoom(roomId: string) {
    this.socket.emit(QuizzEventName.LeaveRoom, roomId);
  }

  removePlayer(roomId: string, playerId: string) {
    this.socket.emit(QuizzEventName.RemovePlayer, { roomId, playerId });
  }

  updateRoomConfig(roomId: string, config: RoomConfig) {
    this.socket.emit(QuizzEventName.UpdateRoomConfig, { ...config, roomId });
  }


  startQuizz(roomId: string) {
    return this.socket.emit(QuizzEventName.StartQuizz, roomId);
  }

  showAnswers(roomId: string) {
    return this.socket.emit(QuizzEventName.ShowAnswers, roomId);
  }

  setUserPoints(roomId: string, answers: Answers) {
    return this.socket.emit(QuizzEventName.SetUserPoints, { roomId, answers });
  }

  playerAnswer(roomId: string, questionId: string, response: string) {
    return this.socket.emit(QuizzEventName.PlayerAnswer, {
      roomId,
      questionId,
      response,
    });
  }

  indexAnswersChange(roomId: string, index: number) {
    return this.socket.emit(QuizzEventName.ChangeIndexAnswers, { roomId, index });
  }

  roomCreated() {
    return this.socket.fromEvent<IRoom, string>(QuizzEventName.RoomCreated);
  }

  roomJoined() {
    return this.socket.fromEvent<IRoom, string>(QuizzEventName.RoomJoined);
  }

  addPlayer() {
    return this.socket.fromEvent<Player, string>(QuizzEventName.AddPlayer);
  }

  quizzStarted() {
    return this.socket.fromEvent<void, string>(QuizzEventName.QuizzStarted);
  }

  removedPlayer() {
    return this.socket.fromEvent<{ socketId: string }, string>(QuizzEventName.RemovedPlayer);
  }

  newRoundData() {
    return this.socket.fromEvent<IQuestion, string>(QuizzEventName.NewRoundData);
  }

  onShowResult() {
    return this.socket.fromEvent<IRoom, string>(QuizzEventName.ShowResult);
  }

  onEndQuizz() {
    return this.socket.fromEvent<void, string>(QuizzEventName.EndQuizz);
  }

  onShowAnswers() {
    return this.socket.fromEvent<IRoom, string>(QuizzEventName.ShowAnswers);
  }


  onRoonConfigUpdated() {
    return this.socket.fromEvent<IRoom, string>(QuizzEventName.RoomConfigUpdated);
  }

  onIndexAnswersChange() {
    return this.socket.fromEvent<number, string>(QuizzEventName.ChangeIndexAnswers);
  }
}
