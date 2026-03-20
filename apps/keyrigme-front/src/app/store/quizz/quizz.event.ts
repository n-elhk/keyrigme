import { IQuestion, IRoom, Player } from '@keyrigme/keyrigme-models';
import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

export const quizzEvents = eventGroup({
    source: 'Quizz events',
    events: {
        createRoomSuccess: type<IRoom>(),

        joinRoomSuccess: type<IRoom>(),

        addPlayer: type<Player>(),
        removePlayer: type<Pick<Player, 'socketId'>>(),

        quizzUpdatedSuccess: type<IRoom>(),

        newRoundData: type<IQuestion>(),
        updateValidityAnswer: type<{
            questionId: string;
            socketId: string;
            point: number;
        }>(),
        updatePlayerAnswerIndex: type<{ index: number }>(),
    },
});