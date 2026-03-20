import {
  CATEGORIES_VALUES,
  type IQuestion,
  type IRoom,
} from '@keyrigme/keyrigme-models';

export type QuizzState = {
  room: IRoom | null;
  questions: IQuestion[];
};

export const DEFAULT_ROMM_CONFIG = {
  noOfPlayers: 5,
  noOfRounds: 5,
  categories: CATEGORIES_VALUES,
};
