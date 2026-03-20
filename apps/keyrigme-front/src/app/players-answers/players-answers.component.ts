import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { AnswerStepperComponent } from './answer-stepper/answer-stepper.component';
import { CdkStep } from '@angular/cdk/stepper';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { QuestionComponent } from "../shared/components/question/question.component";
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { QuizzStore } from '../store/quizz/quizz.store';
import { Dispatcher } from '@ngrx/signals/events';
import { quizzEvents } from '../store/quizz/quizz.event';

@Component({
  templateUrl: './players-answers.component.html',
  styleUrl: './players-answers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatChipListbox,
    MatChipOption,
    AnswerStepperComponent,
    CdkStep,
    MatButton,
    QuestionComponent,
    MatProgressBar
  ]
})
export default class AnswersVerificationComponent {
  private readonly quizzStore = inject(QuizzStore);
  readonly dispatcher = inject(Dispatcher);
  private readonly quizzSocketService = inject(QuizzSocketService);
  readonly room = this.quizzStore.room;
  readonly questions = this.quizzStore.questions;
  readonly players = this.quizzStore.players;
  readonly answers = this.quizzStore.answers;
  readonly isOwner = this.quizzStore.isOwner;

  readonly responseCount = computed(() => this.questions().length * this.players().length)

  private readonly playerAnswerIndex$ = this.quizzSocketService
    .onIndexAnswersChange()
    .pipe(startWith(0));

  readonly playerAnswerIndex = toSignal(this.playerAnswerIndex$, {
    requireSync: true,
  });

  updateValidityAnswer(
    questionId: string,
    socketId: string,
    questionPoint: number,
    currentPoint: number
  ) {
    const point = this.getPoint(questionPoint, currentPoint);
    this.dispatcher.dispatch(quizzEvents.updateValidityAnswer({ questionId, socketId, point }));
  }

  setUserPoints() {
    const answers = this.answers();
    const room = this.room();
    if (room && answers) {
      this.quizzSocketService.setUserPoints(room._id, answers);
    }
  }

  getPoint(questionPoint: number, currentPoint: number) {
    if (currentPoint === 0) {
      return questionPoint;
    }
    return 0;
  }
}
