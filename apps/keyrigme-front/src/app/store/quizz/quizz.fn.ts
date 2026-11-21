import type { PartialStateUpdater } from '@ngrx/signals';
import { castDraft, produce } from 'immer';
import { type QuizzState } from './quizz.type';
import type {
  Answers,
  IPublicQuestion,
  IQuestion,
  IRoom,
  Player,
} from '@keyrigme/models';

export const updateRoomfn = (
  room: IRoom,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      draft.room = castDraft(room);
    });
};

export const newRoundDataFn = (
  round: IPublicQuestion,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      draft.rounds.push(castDraft(round));
    });
};

export const answersShownFn = (payload: {
  room: IRoom;
  questions: ReadonlyArray<IQuestion>;
}): PartialStateUpdater<QuizzState> => {
  return () => ({ room: payload.room, questions: payload.questions });
};

export const addPlayerFn = (
  player: Player,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      // An event of a room that was just left can still arrive: ignore it.
      if (!draft.room) return;
      draft.room.players.push(player);
    });
};

export const removePlayerFn = (
  payload: Pick<Player, 'playerId'>,
): PartialStateUpdater<QuizzState> => {
  return (state) =>
    produce(state, (draft) => {
      if (!state.room || !draft.room) return;

      const players = state.room.players.filter(
        (p) => p.playerId !== payload.playerId,
      );
      draft.room.players = players;
    });
};

export const updateValidityAnswerFn = (payload: {
  questionId: string;
  playerId: string;
  point: number;
}): PartialStateUpdater<QuizzState> => {
  return (state) => {
    const { questionId, playerId, point } = payload;
    return produce(state, (draft) => {
      if (draft.room) {
        draft.room.answers[questionId][playerId].point = point;
      }
    });
  };
};

export const getUserPoints = (players: ReadonlyArray<Player>, answers?: Answers) => {
  const playersPoints = players.reduce(
    (acc, curr) => {
      return {
        ...acc,
        [curr.playerId]: {
          username: curr.username,
          playerId: curr.playerId,
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
        // A player who left the room after the game keeps their answers, but is no longer ranked.
        const player = playersPoints[c];
        if (player) player.point += t[c].point;
      }
    }
  }
  return Object.values(playersPoints);
};
