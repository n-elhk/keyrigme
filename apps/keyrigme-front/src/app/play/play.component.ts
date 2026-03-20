import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { filter, map, merge, switchMap, tap } from 'rxjs';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { countdown } from '../shared/utils/rxjs/countdown.rx';
import { msToSecond, timeToPercent } from '../shared/utils/functions/number.fn';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { QuestionComponent } from '../shared/components/question/question.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, form } from '@angular/forms/signals';
import { IQuestion } from '@keyrigme/keyrigme-models';

@Component({
  templateUrl: './play.component.html',
  styleUrl: './play.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatInput,
    MatButton,
    QuestionComponent,
    MatProgressBarModule,
    FormField,
  ],
})
export default class PlayComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzSocketService = inject(QuizzSocketService);

  readonly room = this.quizzStore.room;

  readonly currentQuestion = computed<IQuestion | null>(() => {
    const questionsValue = this.quizzStore.questions();
    return questionsValue[questionsValue.length - 1] ?? null;
  });

  readonly previousQuestion = computed<IQuestion | null>(() => {
    const questionsValue = this.quizzStore.questions();
    return questionsValue[questionsValue.length - 2] ?? null;
  });

  private readonly response = signal('');
  readonly reponseForm = form(this.response);

  readonly reponseValue = computed(() => this.reponseForm().value());

  private readonly countdown$ = toObservable(this.currentQuestion).pipe(
    filter((question) => !!question),
    switchMap(({ timer }) =>
      countdown(timer).pipe(map((elapsedTime) => [elapsedTime, timer])),
    ),
  );

  readonly countdown = toSignal(
    this.countdown$.pipe(map(([time]) => msToSecond(time))),
    { initialValue: 0 },
  );

  private readonly percent$ = this.countdown$.pipe(
    map(([time, questionTimer]) => timeToPercent(time, questionTimer)),
  );

  readonly percent = toSignal(this.percent$, {
    initialValue: 0,
  });

  readonly quizzEnd$ = this.quizzSocketService
    .onEndQuizz()
    .pipe(map(() => true));

  readonly quizzEnded = toSignal(this.quizzEnd$, {
    initialValue: false,
  });

  private readonly sendResponse$ = merge(
    this.quizzSocketService
      .newRoundData()
      .pipe(map(() => this.previousQuestion())),
    this.quizzEnd$.pipe(map(() => this.currentQuestion())),
  ).pipe(
    tap((question) => {
      const room = this.room();
      if (room && question) {
        this.quizzSocketService.playerAnswer(
          room._id,
          question._id,
          this.reponseForm().value(),
        );
        this.reponseForm().value.set('');
      }
    }),
  );

  constructor() {
    this.sendResponse$.pipe(takeUntilDestroyed()).subscribe();
  }

  showAnswers() {
    const room = this.room();
    if (room) {
      this.quizzSocketService.showAnswers(room._id);
    }
  }
}
