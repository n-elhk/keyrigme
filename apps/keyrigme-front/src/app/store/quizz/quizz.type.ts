import {
  CATEGORIES_VALUES,
  type IPublicQuestion,
  type IQuestion,
  type IRoom,
} from '@keyrigme/models';

export type QuizzState = {
  room: IRoom | null;
  /** Rounds received during the game, without their answers. */
  rounds: IPublicQuestion[];
  /** Full questions of the game, answers included, received once it is over. */
  questions: ReadonlyArray<IQuestion>;
};

export const DEFAULT_ROMM_CONFIG = {
  noOfPlayers: 5,
  noOfRounds: 5,
  categories: CATEGORIES_VALUES,
};
