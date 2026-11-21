import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { QuizzRpcService } from '../shared/services/quizz-rpc.service';
import { filter, map, merge, switchMap, tap } from 'rxjs';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { countdown } from '../shared/utils/rxjs/countdown.rx';
import { msToSecond, timeToPercent } from '../shared/utils/functions/number.fn';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { QuestionComponent } from '../shared/components/question/question.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { QuizzStore } from '../store/quizz/quizz.store';
import { FormField, disabled, form } from '@angular/forms/signals';
import { isOrderQuestion, type IPublicQuestion, type PlayerResponse } from '@keyrigme/models';
import { OrderAnswerComponent } from '../shared/components/order-answer/order-answer.component';

@Component({
  template: `
    @let question = currentQuestion();

    @if (question) {
      <app-question [question]="question">
        <ng-container question-header>
          <mat-progress-bar
            class="w100"
            mode="determinate"
            aria-label="Temps écoulé pour la question"
            [value]="percent()" />
        </ng-container>

        <ng-container question-footer>
          @if (question.type === 'Order') {
            <app-order-answer
              [items]="question.items"
              [(order)]="orderResponse"
              [disabled]="quizzEnded()" />
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>Ta réponse</mat-label>
              <input matInput [formField]="reponseForm" type="text" autocomplete="off" />
            </mat-form-field>
          }

          @if (quizzEnded()) {
            <div class="show-result-container">
              <button mat-flat-button type="button" (click)="showAnswers()">
                Voir les réponses
              </button>
            </div>
          }
        </ng-container>
      </app-question>
    }
  `,
  styles: `
    mat-form-field {
      width: 100%;
    }

    mat-progress-bar {
      margin-bottom: 0.5rem;
    }

    .show-result-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-block-start: 1rem;
    }
  `,
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    QuestionComponent,
    MatProgressBarModule,
    FormField,
    OrderAnswerComponent,
  ],
})
export default class PlayComponent {
  private readonly quizzStore = inject(QuizzStore);
  private readonly quizzRpcService = inject(QuizzRpcService);

  readonly room = this.quizzStore.room;

  readonly currentQuestion = computed<IPublicQuestion | null>(
    () => this.quizzStore.rounds().at(-1) ?? null,
  );

  readonly previousQuestion = computed<IPublicQuestion | null>(
    () => this.quizzStore.rounds().at(-2) ?? null,
  );

  private readonly response = signal('');
  // Once the quizz has ended the answer is already sent: it can no longer be changed.
  readonly reponseForm = form(this.response, (path) => {
    disabled(path, { when: () => this.quizzEnded() });
  });

  /** Item ids in the order chosen by the player, for an `Order` question. */
  readonly orderResponse = signal<ReadonlyArray<string>>([]);

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

  readonly quizzEnd$ = this.quizzRpcService
    .on('EndQuizz')
    .pipe(map(() => true));

  readonly quizzEnded = toSignal(this.quizzEnd$, {
    initialValue: false,
  });

  /** Sends the answer to the round that just ended, then gets ready for the next one, if any. */
  private readonly sendResponse$ = merge(
    this.quizzRpcService.on('NewRoundData').pipe(
      map(() => ({
        answered: this.previousQuestion(),
        next: this.currentQuestion(),
      })),
    ),
    this.quizzEnd$.pipe(
      map(() => ({ answered: this.currentQuestion(), next: null })),
    ),
  ).pipe(
    tap(({ answered, next }) => {
      if (answered) {
        void this.quizzRpcService.playerAnswer(
          answered.id,
          this.responseTo(answered),
        );
      }
      // The last question stays on screen once the quizz has ended.
      if (next) this.resetResponse(next);
    }),
  );

  constructor() {
    // The first round may have been received before this page was displayed.
    this.resetResponse(this.currentQuestion());
    this.sendResponse$.pipe(takeUntilDestroyed()).subscribe();
  }

  private responseTo(question: IPublicQuestion): PlayerResponse {
    return isOrderQuestion(question)
      ? this.orderResponse()
      : this.reponseForm().value();
  }

  private resetResponse(question: IPublicQuestion | null) {
    this.reponseForm().value.set('');
    this.orderResponse.set(
      question && isOrderQuestion(question)
        ? question.items.map((item) => item.id)
        : [],
    );
  }

  showAnswers() {
    void this.quizzRpcService.showAnswers();
  }
}
