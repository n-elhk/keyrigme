import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IQuestion } from '@keyrigme/keyrigme-models';

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
      <ng-content select="[question-footer]"></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class QuestionComponent {
  readonly question = input.required<IQuestion>();
}
