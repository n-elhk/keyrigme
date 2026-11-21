import { signalStore, withComputed, withProps, withState } from '@ngrx/signals';
import { on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { quizzEvents } from './quizz.event';
import { DEFAULT_ROMM_CONFIG, QuizzState } from './quizz.type';
import {
  addPlayerFn,
  answersShownFn,
  updateRoomfn,
  getUserPoints,
  newRoundDataFn,
  removePlayerFn,
  updateValidityAnswerFn,
} from './quizz.fn';
import { QuizzRpcService } from '../../shared/services/quizz-rpc.service';
import { computed, inject } from '@angular/core';
import { filter, map, tap } from 'rxjs';
import { PAGES } from '../../shared/constants/pages.const';
import { Router } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';

export const initialQuizzState: QuizzState = {
  room: null,
  rounds: [],
  questions: [],
};

export const QuizzStore = signalStore(
  { providedIn: 'root' },
  withState<QuizzState>(initialQuizzState),
  withProps(() => ({
    _quizzRpcService: inject(QuizzRpcService),
    _router: inject(Router),
    _liveAnnouncer: inject(LiveAnnouncer),
  })),
  withComputed(({ room }) => ({
    players: computed(() => room()?.players ?? []),
  })),
  withComputed(({ room, _quizzRpcService, players }) => ({
    isOwner: computed(
      () => !!room() && _quizzRpcService.playerId() === room()?.owner.playerId,
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
  withEventHandlers((store) => {
    const rpc = store._quizzRpcService;
    return {
      roomEntered$: rpc.sessions$.pipe(
        map(({ room }) => quizzEvents.createRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Lobby])),
      ),

      // The reloaded page is already the right one: no navigation.
      roomResumed$: rpc.resumed$.pipe(
        map(({ room }) => quizzEvents.joinRoomSuccess(room)),
      ),

      // Forget the previous room: a new one starts from a clean state.
      sessionClosed$: rpc.closed$.pipe(map(() => quizzEvents.sessionClosed())),

      sessionLost$: rpc.lost$.pipe(tap(() => void store._router.navigate(['/']))),

      playerAdded$: rpc
        .on('PlayerAdded')
        .pipe(map(({ player }) => quizzEvents.addPlayer(player))),

      playerRemoved$: rpc.on('PlayerRemoved').pipe(
        tap(({ playerId }) => {
          if (rpc.isItSelf(playerId)) {
            rpc.closeSession();
            void store._router.navigate(['/']);
          }
        }),
        // The current player's own removal already reset the store through `closed$`.
        filter(({ playerId }) => !rpc.isItSelf(playerId)),
        map(({ playerId }) => quizzEvents.removePlayer({ playerId })),
      ),

      quizzStarted$: rpc
        .on('QuizzStarted')
        .pipe(tap(() => void store._router.navigate([PAGES.Play]))),

      newRoundData$: rpc
        .on('NewRoundData')
        .pipe(map(({ question }) => quizzEvents.newRoundData(question))),

      showAnswers$: rpc.on('ShowAnswers').pipe(
        tap(() => void store._router.navigate([PAGES.PlayersAnswers])),
        map(({ room, questions }) => quizzEvents.answersShown({ room, questions })),
      ),

      roomConfigUpdated$: rpc
        .on('RoomConfigUpdated')
        .pipe(map(({ room }) => quizzEvents.quizzUpdatedSuccess(room))),

      playersAnswerIndex$: rpc.on('ChangeIndexAnswers').pipe(
        filter(({ from }) => !rpc.isItSelf(from)),
        map(({ index }) => quizzEvents.updatePlayerAnswerIndex({ index })),
      ),

      showResult$: rpc.on('ShowResult').pipe(
        map(({ room }) => quizzEvents.joinRoomSuccess(room)),
        tap(() => void store._router.navigate([PAGES.Result])),
      ),

      quizzReset$: rpc.on('QuizzReset').pipe(
        map(({ room }) => quizzEvents.quizzReset(room)),
        tap(() => {
          void store._router.navigate([PAGES.Lobby]);
          void store._liveAnnouncer.announce('Nouvelle partie : retour au salon');
        }),
      ),
    };
  }),

  withReducer(
    on(quizzEvents.sessionClosed, () => initialQuizzState),
    on(quizzEvents.quizzReset, ({ payload: room }) => ({ ...initialQuizzState, room })),
    on(quizzEvents.createRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.joinRoomSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.quizzUpdatedSuccess, ({ payload }) => updateRoomfn(payload)),
    on(quizzEvents.newRoundData, ({ payload }) => newRoundDataFn(payload)),
    on(quizzEvents.answersShown, ({ payload }) => answersShownFn(payload)),
    on(quizzEvents.addPlayer, ({ payload: player }) => addPlayerFn(player)),
    on(quizzEvents.removePlayer, ({ payload: player }) =>
      removePlayerFn(player),
    ),
    on(quizzEvents.updateValidityAnswer, ({ payload: data }) =>
      updateValidityAnswerFn(data),
    ),
  ),
);
