import { Component, computed, inject } from '@angular/core';
import { QuizzRpcService } from '../shared/services/quizz-rpc.service';
import { AnswerStepperComponent } from './answer-stepper/answer-stepper.component';
import { CdkStep } from '@angular/cdk/stepper';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { QuestionComponent } from "../shared/components/question/question.component";
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { QuizzStore } from '../store/quizz/quizz.store';
import { Dispatcher } from '@ngrx/signals/events';
import { quizzEvents } from '../store/quizz/quizz.event';
import { OrderReviewComponent } from './order-review/order-review.component';

@Component({
  templateUrl: './players-answers.component.html',
  styleUrl: './players-answers.component.css',
  imports: [
    MatChipListbox,
    MatChipOption,
    AnswerStepperComponent,
    CdkStep,
    MatButton,
    QuestionComponent,
    MatProgressBar,
    OrderReviewComponent,
  ]
})
export default class AnswersVerificationComponent {
  private readonly quizzStore = inject(QuizzStore);
  readonly dispatcher = inject(Dispatcher);
  private readonly quizzRpcService = inject(QuizzRpcService);
  readonly room = this.quizzStore.room;
  readonly questions = this.quizzStore.questions;
  readonly players = this.quizzStore.players;
  readonly answers = this.quizzStore.answers;
  readonly isOwner = this.quizzStore.isOwner;

  readonly responseCount = computed(() => this.questions().length * this.players().length)

  private readonly playerAnswerIndex$ = this.quizzRpcService
    .on('ChangeIndexAnswers')
    .pipe(
      filter(({ from }) => !this.quizzRpcService.isItSelf(from)),
      map(({ index }) => index),
      startWith(0),
    );

  readonly playerAnswerIndex = toSignal(this.playerAnswerIndex$, {
    requireSync: true,
  });

  updateValidityAnswer(
    questionId: string,
    playerId: string,
    questionPoint: number,
    currentPoint: number
  ) {
    const point = this.getPoint(questionPoint, currentPoint);
    this.dispatcher.dispatch(quizzEvents.updateValidityAnswer({ questionId, playerId, point }));
  }

  setUserPoints() {
    const answers = this.answers();
    if (answers) {
      void this.quizzRpcService.setUserPoints(answers);
    }
  }

  getPoint(questionPoint: number, currentPoint: number) {
    if (currentPoint === 0) {
      return questionPoint;
    }
    return 0;
  }
}
