import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuizzSocketService } from '../shared/services/quizz-socket.service';
import { AnswerStepperComponent } from './answer-stepper/answer-stepper.component';
import { CdkStep } from '@angular/cdk/stepper';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { QuestionComponent } from '../shared/components/question/question.component';
import { QuizzStore } from '../store/quizz/quizz.store';
import { Dispatcher } from '@ngrx/signals/events';
import { quizzEvents } from '../store/quizz/quizz.event';

@Component({
  template: `
    @if (room(); as roomValue) {
      @let isOwnerValue = isOwner();
      <app-answer-stepper
        #stepper
        [selectedIndex]="playerAnswerIndex()"
        [roomId]="roomValue._id"
        [isOwner]="!!isOwnerValue">
        @for (question of questions(); track question._id; let lastQuestion = $last) {
          @for (player of players(); track player.socketId; let lastPlayer = $last) {
            <cdk-step>
              <app-question [question]="question">
                <ng-container question-header>
                  <div class="flex items-center gap-3 w-full px-4 pt-4">
                    <div class="flex-1 h-3 bg-white border-[2px] border-black overflow-hidden"
                      role="progressbar"
                      [attr.aria-valuenow]="((stepper.selectedIndex + 1) / responseCount()) * 100"
                      aria-valuemin="0" aria-valuemax="100">
                      <div class="h-full bg-yellow transition-all duration-300"
                        [style.width.%]="((stepper.selectedIndex + 1) / responseCount()) * 100"></div>
                    </div>
                    <span class="neo-badge shrink-0">{{ stepper.selectedIndex + 1 }}/{{ responseCount() }}</span>
                  </div>
                </ng-container>
                <ng-container question-footer>
                  @if (answers(); as usersAnswers) {
                    @let currentAnswer = usersAnswers[question._id][player.socketId];
                    <div class="px-4 pb-6 flex flex-col gap-3">
                      <div class="neo-card p-4 flex items-center gap-3">
                        <div class="flex-1">
                          <p class="text-xs font-black tracking-[2px] uppercase text-black/60">{{ player.username }}</p>
                          <p class="text-lg font-black mt-0.5">{{ currentAnswer.response }}</p>
                        </div>
                        @if (isOwnerValue) {
                          <button type="button" class="neo-btn px-4 py-2 text-xs transition-colors"
                            [class]="currentAnswer.point > 0
                              ? 'bg-green-valid text-white border-[2px] border-black shadow-[2px_2px_0_#000]'
                              : 'bg-white text-black border-[2px] border-black shadow-[2px_2px_0_#000]'"
                            [attr.aria-pressed]="currentAnswer.point > 0"
                            (click)="updateValidityAnswer(question._id, player.socketId, question.point, currentAnswer.point)">
                            {{ currentAnswer.point > 0 ? '✓ ' + question.point + ' pts' : '✗ 0 pt' }}
                          </button>
                        }
                      </div>
                      @if (lastQuestion && lastPlayer && isOwnerValue) {
                        <button type="button" class="neo-btn-black w-full py-3 text-sm" (click)="setUserPoints()">
                          Voir les résultats
                        </button>
                      }
                    </div>
                  }
                </ng-container>
              </app-question>
            </cdk-step>
          }
        }
      </app-answer-stepper>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AnswerStepperComponent, CdkStep, QuestionComponent],
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

  readonly responseCount = computed(
    () => this.questions().length * this.players().length
  );

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
    this.dispatcher.dispatch(
      quizzEvents.updateValidityAnswer({ questionId, socketId, point })
    );
  }

  setUserPoints() {
    const answers = this.answers();
    const room = this.room();
    if (room && answers) {
      this.quizzSocketService.setUserPoints(room._id, answers);
    }
  }

  getPoint(questionPoint: number, currentPoint: number) {
    if (currentPoint === 0) return questionPoint;
    return 0;
  }
}
