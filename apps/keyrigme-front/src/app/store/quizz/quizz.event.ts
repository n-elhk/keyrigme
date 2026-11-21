import { IPublicQuestion, IQuestion, IRoom, Player } from '@keyrigme/models';
import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

export const quizzEvents = eventGroup({
    source: 'Quizz events',
    events: {
        createRoomSuccess: type<IRoom>(),

        joinRoomSuccess: type<IRoom>(),

        addPlayer: type<Player>(),
        removePlayer: type<Pick<Player, 'playerId'>>(),

        quizzUpdatedSuccess: type<IRoom>(),

        newRoundData: type<IPublicQuestion>(),
        answersShown: type<{ room: IRoom; questions: ReadonlyArray<IQuestion> }>(),
        updateValidityAnswer: type<{
            questionId: string;
            playerId: string;
            point: number;
        }>(),
        updatePlayerAnswerIndex: type<{ index: number }>(),

        /** A new game starts with the same room: the previous game's rounds and questions are dropped. */
        quizzReset: type<IRoom>(),

        sessionClosed: type<void>(),
    },
});