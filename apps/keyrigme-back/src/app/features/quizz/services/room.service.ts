import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { Answers, Player, RoomStatus, UserBonus } from '@keyrigme/keyrigme-models';
import { UpdateRoomConfigDto } from '../validators/room-config-validator';

@Injectable()
export class RoomService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) { }

  async findById(id: string): Promise<RoomDocument | null> {
    return this.roomModel.findById(id).exec();
  }

  async findByIdWithQuestion(
    roomId: string,
    socketId: string
  ): Promise<RoomDocument | null> {
    return this.roomModel
      .findOne({ _id: roomId, 'owner.socketId': socketId })
      .populate('questions')
      .exec();
  }

  async findOneByCode(
    code: string,
  ): Promise<RoomDocument | null> {
    return this.roomModel.findOne({ code, status: RoomStatus.Initial }).exec();
  }

  async findRoomByOwnerInReview(
    roomId: string,
    socketId: string
  ): Promise<RoomDocument | null> {
    return this.roomModel
      .findOne({ _id: roomId, 'owner.socketId': socketId, status: RoomStatus.Review })
      .exec();
  }

  async startRoom(
    roomId: string,
    socketId: string
  ): Promise<RoomDocument | null> {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId, 'owner.socketId': socketId, status: RoomStatus.Initial },
        { $set: { status: RoomStatus.Started } },
        { isNew: true }
      )
      .exec();
  }

  async initilizeBonus(
    roomId: string,
    socketId: string,
    players: Player[]
  ): Promise<RoomDocument | null> {
    const bonus = players.reduce((acc, curr) => {
      return { ...acc, [curr.socketId]: { point: 0 } };
    }, {} as UserBonus);

    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId, 'owner.socketId': socketId, status: RoomStatus.Started },
        { $set: { bonus } },
        { isNew: true }
      )
      .exec();
  }

  private createAnswerObject(
    questions: string[],
    players: string[]
  ): Answers {
    const result: Answers = {};

    for (const question of questions) {
      result[question] = {};

      for (const player of players) {
        result[question][player] = {
          response: '',
          point: 0,
        };
      }
    }

    return result;
  }

  addQuestionsToRoom(roomId: string, questionIds: string[], playersIds: string[]) {
    const answers = this.createAnswerObject(questionIds, playersIds);

    return this.roomModel
      .findOneAndUpdate(
        {
          _id: roomId   // Spécifie l'_id du document à mettre à jour
        },
        {
          $push: { questions: { $each: questionIds } },
          $set: { answers },
        },
        {
          new: true, // Option pour retourner le document après la mise à jour
        }
      )
      .exec();
  }

  addPlayer(roomId: string, socketId: string, player: Omit<Player, 'socketId'>) {
    const { username, avatar } = player;
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId }, // Critère de recherche : ici, nous utilisons l'identifiant de l'utilisateur pour trouver le document approprié
        { $push: { players: { username, socketId, avatar } } }, // Opération : ajouter le nouvel objet connection au tableau players
        // { new: true, upsert: true } // Options : retourner le document modifié après la mise à jour, créer un nouveau document si aucun document ne correspond au critère de recherche
        { new: true } // Options : retourner le document modifié après la mise à jour, créer un nouveau document si aucun document ne correspond au critère de recherche
      )
      .exec();
  }

  updateRoomConfig(roomId: string, socketId: string, roomConfig: UpdateRoomConfigDto) {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId, 'owner.socketId': socketId, status: RoomStatus.Initial },
        { $set: { noOfPlayers: roomConfig.noOfPlayers, noOfRounds: roomConfig.noOfRounds, categories: roomConfig.categories } }, // Opération : ajouter le nouvel objet connection au tableau players
        { new: true } // Options : retourner le document modifié après la mise à jour, créer un nouveau document si aucun document ne correspond au critère de recherche
      )
      .exec();
  }


  /**
   * Add a user along with the corresponding socket to the passed room
   *
   */
  removeUser(roomId: string, socketId: string, playerId: string) {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId, 'owner.socketId': socketId }, // Critère de recherche : chercher dans les documents où au moins une connexion a le socketId spécifié
        { $pull: { players: { socketId: playerId } } }, // Opération : supprimer l'élément du tableau players qui a ce socketId
        { new: true } // Options : retourner le document modifié après la mise à jour
      )
      .exec();
  }

  /**
 * Add a user along with the corresponding socket to the passed room
 *
 */
  removeOnLeaveUser(roomId: string, socketId: string) {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId }, // Critère de recherche : chercher dans les documents où au moins une connexion a le socketId spécifié
        { $pull: { players: { socketId } } }, // Opération : supprimer l'élément du tableau players qui a ce socketId
        { new: true } // Options : retourner le document modifié après la mise à jour
      )
      .exec();
  }

  /**
   * Set user answer
   * Answer object are created when the quizz is started
   */
  setUserAnswer(
    roomId: string,
    questionId: string,
    socketId: string,
    response: string
  ) {
    const answers = {
      [`answers.${questionId}.${socketId}.response`]: response,
    };

    return this.roomModel
      .findOneAndUpdate({ _id: roomId }, { $set: answers }, { new: true })
      .exec();
  }

  setUserPointsAndEndRoom(roomId: string, socketId: string, answers: Answers) {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId, 'owner.socketId': socketId },
        { $set: { answers, status: RoomStatus.Ended } },
        { new: true }
      )
      .exec();
  }

  passRoomInReview(roomId: string) {
    return this.roomModel
      .findOneAndUpdate(
        { _id: roomId },
        { $set: { status: RoomStatus.Review } },
        { new: true }
      )
      .exec();
  }

  async create(room: Partial<RoomDocument>) {
    return new this.roomModel(room).save();
  }
}
