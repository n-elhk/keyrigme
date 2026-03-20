import { QuestionCategoriesValues } from './question.type';
import type { RoomStatus } from '../constants';

export type RoomStatusTypesValues = keyof typeof RoomStatus;

export interface IRoom {
  _id: string;
  code: string;
  noOfPlayers: number;
  noOfRounds: number;
  categories: QuestionCategoriesValues[];
  players: Player[];
  owner: Player;
  answers: Answers;
  bonus: UserBonus;
  questions: string[];
  status: RoomStatusTypesValues;
  createdAt: string;
  updatedAt: string;
}

export type RoomWithoutId = Omit<IRoom, '_id'>;

export type RoomConfig = {
  noOfPlayers: number;
  noOfRounds: number;
  categories: QuestionCategoriesValues[];
};

export type Player = {
  username: string;
  socketId: string;
  avatar: string;
};

export type Answers = Record<string, Record<string, Answer>>;

export type Answer = {
  response: string;
  point: number;
};

export type Bonus = {
  point: number;
};

export type UserBonus = Record<string, Bonus>;
