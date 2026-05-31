import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { filter, map, merge, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { countdown } from '../shared/utils/rxjs/countdown.rx';
import { msToSecond, timeToPercent } from '../shared/utils/functions/number.fn';
import { QuestionComponent } from '../shared/components/question/question.component';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, form } from '@angular/forms/signals';
import { IQuestion } from '@keyrigme/keyrigme-models';

@Component({
  template: `
    @let question = currentQuestion();
    @if (question) {
      <app-question [question]="question">
        <ng-container question-header>
          <div class="flex items-center gap-3 w-full px-4 pt-4">
            <div
              class="flex-1 h-3 bg-white border-[2px] border-black overflow-hidden"
              role="progressbar"
              [attr.aria-valuenow]="percent()"
              aria-valuemin="0"
              aria-valuemax="100">
              <div class="h-full bg-yellow transition-all duration-100" [style.width.%]="percent()"></div>
            </div>
            <span class="neo-badge shrink-0">{{ countdown() }}s</span>
          </div>
        </ng-container>
        <ng-container question-footer>
          <div class="px-4 pb-6 flex flex-col gap-4">
            <div>
              <label for="reponse" class="block text-xs font-black tracking-[2px] uppercase mb-2">
                Ta réponse
              </label>
              <input
                type="text"
                id="reponse"
                class="neo-input text-center text-lg"
                [formField]="reponseForm"
                placeholder="Écris ta réponse…"
                aria-label="Ta réponse" />
            </div>
            @if (quizzEnded()) {
              <button type="button" class="neo-btn-black w-full py-3 text-sm" (click)="showAnswers()">
                Voir les réponses
              </button>
            }
          </div>
        </ng-container>
      </app-question>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuestionComponent, FormField],
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
      countdown(timer).pipe(map((elapsedTime) => [elapsedTime, timer]))
    ),
  );

  readonly countdown = toSignal(
    this.countdown$.pipe(map(([time]) => msToSecond(time))),
    { initialValue: 0 },
  );

  private readonly percent$ = this.countdown$.pipe(
    map(([time, questionTimer]) => timeToPercent(time, questionTimer)),
  );

  readonly percent = toSignal(this.percent$, { initialValue: 0 });

  readonly quizzEnd$ = this.quizzSocketService.onEndQuizz().pipe(map(() => true));
  readonly quizzEnded = toSignal(this.quizzEnd$, { initialValue: false });

  private readonly sendResponse$ = merge(
    this.quizzSocketService.newRoundData().pipe(map(() => this.previousQuestion())),
    this.quizzEnd$.pipe(map(() => this.currentQuestion())),
  ).pipe(
    tap((question) => {
      const room = this.room();
      if (room && question) {
        this.quizzSocketService.playerAnswer(
          room._id,
          question._id,
          this.reponseForm().value()
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
