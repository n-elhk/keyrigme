import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  type Answer,
  type RoomWithoutId,
  type Player,
  type UserBonus,
  type RoomStatusTypesValues,
  RoomStatus,
  QuestionCategoriesValues,
  CATEGORIES_VALUES,
} from '@keyrigme/keyrigme-models';

export type RoomDocument = Room & Document;

@Schema()
export class Room implements RoomWithoutId {
  @Prop({ type: String, required: true }) public code: string;

  @Prop({ type: String, default: RoomStatus.Initial })
  public status: RoomStatusTypesValues;

  @Prop({
    type: [{ username: String, socketId: String, avatar: String }],
    default: [],
  })
  public players: Player[];

  @Prop({ type: { username: String, socketId: String, avatar: String } })
  public owner: Player;

  @Prop({ type: Number, default: 10 }) public noOfPlayers: number;

  @Prop({ type: Number, default: 5 }) public noOfRounds: number;

  @Prop({ type: [String], default: CATEGORIES_VALUES })
  public categories: QuestionCategoriesValues[];

  @Prop({ type: Object, default: {} }) public answers: Record<
    string,
    Record<string, Answer>
  >;

  @Prop({ type: Object, default: {} }) public bonus: UserBonus;

  @Prop({ type: [Types.ObjectId], ref: 'Question', default: [] })
  public questions: string[];

  @Prop({ default: new Date().toISOString() }) public createdAt: string;
  @Prop({ default: new Date().toISOString() }) public updatedAt: string;
}

const RoomSchema = SchemaFactory.createForClass(Room);
export { RoomSchema };
