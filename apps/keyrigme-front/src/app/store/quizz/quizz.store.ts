import { signalStore, withComputed, withProps, withState } from '@ngrx/signals';
import { on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { quizzEvents } from './quizz.event';
import { DEFAULT_ROMM_CONFIG, QuizzState } from './quizz.type';
import {
  addPlayerFn,
  updateRoomfn,
  getUserPoints,
  newRoundDataFn,
  removePlayerFn,
  updateValidityAnswerFn,
} from './quizz.fn';
import { QuizzSocketService } from '../../shared/services/quizz-socket.service';
import { computed, inject } from '@angular/core';
import { map, tap } from 'rxjs';
import { PAGES } from '../../shared/constants/pages.const';
import { Router } from '@angular/router';

export const initialQuizzState: QuizzState = {
  room: null,
  questions: [],
};

export const QuizzStore = signalStore(
  { providedIn: 'root' },
  withState<QuizzState>(initialQuizzState),
  withProps(() => ({
    _quizzSocketService: inject(QuizzSocketService),
    _router: inject(Router),
  })),
  withComputed(({ room }) => ({
    players: computed(() => room()?.players ?? []),
  })),
  withComputed(({ room, _quizzSocketService, players }) => ({
    isOwner: computed(
      () => _quizzSocketService.getSocketId() === room()?.owner?.socketId,
    ),
    roomConfig: computed(() => {
      const roomValue = room();
      if (!roomValue) return DEFAULT_ROMM_CONFIG;
      return {
        noOfPlayers: roomValue.noOfPlayers,
        noOfRounds: roomValue.noOfRounds,
        categories: roomValue.categories,
      };
    }),
    playersPoint: computed(() => getUserPoints(players(), room()?.answers)),
    answers: computed(() => room()?.answers ?? null),
  })),
  withEventHandlers(
    (
      store,
      // event = inject(Events),
    ) => ({
      roomCreated$: store._quizzSocketService.roomCreated().pipe(
        map((room) => quizzEvents.createRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Lobby])),
      ),

      roomJoined$: store._quizzSocketService.roomJoined().pipe(
        map((room) => quizzEvents.createRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Lobby])),
      ),

      playerAdded$: store._quizzSocketService
        .addPlayer()
        .pipe(map((player) => quizzEvents.addPlayer(player))),

      playerRemoved$: store._quizzSocketService
        .removedPlayer()
        .pipe(map((player) => quizzEvents.removePlayer(player))),

      quizzStarted$: store._quizzSocketService
        .quizzStarted()
        .pipe(tap(() => store._router.navigate([PAGES.Play]))),

      newRoundData$: store._quizzSocketService
        .newRoundData()
        .pipe(map((round) => quizzEvents.newRoundData(round))),

      showAnswers$: store._quizzSocketService.onShowAnswers().pipe(
        tap(() => void store._router.navigate([PAGES.PlayersAnswers])),
        map((room) => quizzEvents.joinRoomSuccess(room)),
      ),

      roonConfigUpdated$: store._quizzSocketService
        .onRoonConfigUpdated()
        .pipe(map((room) => quizzEvents.quizzUpdatedSuccess(room))),

      playersAnswerIndex$: store._quizzSocketService
        .onIndexAnswersChange()
        .pipe(map((index) => quizzEvents.updatePlayerAnswerIndex({ index }))),

      showResult$: store._quizzSocketService.onShowResult().pipe(
        map((room) => quizzEvents.joinRoomSuccess(room)),
        tap(() => store._router.navigate([PAGES.Result])),
      ),
    }),
  ),

  withReducer(
    on(quizzEvents.createRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.joinRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.quizzUpdatedSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.newRoundData, ({ payload }) => newRoundDataFn(payload)),
    on(quizzEvents.addPlayer, ({ payload: player }) => addPlayerFn(player)),
    on(quizzEvents.removePlayer, ({ payload: player }) =>
      removePlayerFn(player),
    ),
    on(quizzEvents.updateValidityAnswer, ({ payload: data }) =>
      updateValidityAnswerFn(data),
    ),
  ),
);
