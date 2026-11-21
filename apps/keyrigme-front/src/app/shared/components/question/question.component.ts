import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IMediaQuestion, IOrderQuestion, IQuestion, isMediaQuestion, isOrderQuestion } from '@keyrigme/keyrigme-models';
import { MediaQuestionComponent } from './media-question.component';
import { OrderQuestionComponent } from './order-question.component';

@Component({
  selector: 'app-question',
  template: `
    @let questionValue = question();
    <div class="flex flex-col gap-4 w-full max-w-lg mx-auto px-4 py-6">
      <ng-content select="[question-header]"></ng-content>
      <div class="neo-card p-5 text-center">
        <h1 class="text-xl font-black uppercase tracking-wide leading-snug">
          {{ questionValue.title }}
        </h1>
      </div>
      @if (asMedia(); as mq) {
        <app-media-question [question]="mq" />
      } @else if (asOrder(); as oq) {
        <app-order-question [question]="oq" [(orderedIds)]="orderedIds" />
      }
      <ng-content select="[question-footer]"></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MediaQuestionComponent, OrderQuestionComponent],
})
export class QuestionComponent {
  readonly question = input.required<IQuestion>();
  readonly orderedIds = model<string[]>([]);

  readonly asMedia = computed<IMediaQuestion | null>(() => {
    const q = this.question();
    return isMediaQuestion(q) ? q : null;
  });

  readonly asOrder = computed<IOrderQuestion | null>(() => {
    const q = this.question();
    return isOrderQuestion(q) ? q : null;
  });
}
