import type { PartialStateUpdater } from '@ngrx/signals';
import { produce } from 'immer';
import { type QuizzState } from './quizz.type';
import type {
  Answers,
  IQuestion,
  IRoom,
  Player,
} from '@keyrigme/keyrigme-models';

export const updateRoomfn = (
  room: IRoom,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      draft.room = room;
    });
};

export const newRoundDataFn = (
  round: IQuestion,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      draft.questions.push(round);
    });
};

export const addPlayerFn = (
  player: Player,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      if (!state.room || !draft.room) throw new Error('Not implemented yet');
        draft.room.players.push(player);
    });
};

export const removePlayerFn = (
  payload: Pick<Player, 'socketId'>,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      if (!state.room || !draft.room) throw new Error('Not implemented yet');

      const players = state.room.players.filter(
        (p) => p.socketId !== payload.socketId,
      );
      draft.room.players = players;
    });
};

export const updateValidityAnswerFn = (payload: {
  questionId: string;
  socketId: string;
  point: number;
}): PartialStateUpdater<QuizzState> => {
  return (state) => {
    const { questionId, socketId, point } = payload;
    return produce(state, (draft) => {
      if (draft.room) {
        draft.room.answers[questionId][socketId].point = point;
      }
    });
  };
};

export const getUserPoints = (players: Player[], answers?: Answers) => {
  const playersPoints = players.reduce(
    (acc, curr) => {
      return {
        ...acc,
        [curr.socketId]: {
          username: curr.username,
          socketId: curr.socketId,
          avatar: curr.avatar,
          point: 0,
        },
      };
    },
    {} as Record<string, Player & { point: number }>,
  );

  if (answers) {
    const tt = Object.values(answers);
    for (const t of tt) {
      const cc = Object.keys(t);
      for (const c of cc) {
        playersPoints[c].point = playersPoints[c].point + t[c].point;
      }
    }
  }
  return Object.values(playersPoints);
};
