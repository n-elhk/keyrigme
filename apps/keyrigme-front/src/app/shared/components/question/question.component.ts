import { Component, input } from '@angular/core';
import { IPublicQuestion } from '@keyrigme/models';
import { QuestionMediaComponent } from './question-media/question-media.component';

/** Frame of a question: its title, its media if any, and slots for the header and the answer. */
@Component({
  selector: 'app-question',
  template: `
    @let questionValue = question();
    <ng-content select="[question-header]"></ng-content>

    <div class="app-container">
      <div class="question-container">
        <section class="w100 question-content">
          <div class="question-body">
            <h1>{{ questionValue.title }}</h1>

            @if (questionValue.type === 'Media' && questionValue.files.length > 0) {
              <app-question-media
                [mediaType]="questionValue.mediaType"
                [files]="questionValue.files" />
            }
          </div>
        </section>

        <div class="w100">
          <ng-content select="[question-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: `
    .question-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .question-content {
      position: relative;
      overflow: hidden;
      place-content: center;
      background-color: var(--color-question-bg);
      border: 2px solid var(--color-accent);
      border-radius: var(--radius-large);
      text-align: center;
      color: var(--color-question-text);
      font-size: 1.5rem;
    }

    @media (width >= 64em) {
      .question-content:not(:has(app-question-media)) {
        min-height: 500px;
      }
    }

    .question-content::before,
    .question-content::after {
      content: '';
      position: absolute;
      width: 100px;
      height: 100px;
      background-color: var(--color-accent-soft);
      border-radius: 50%;
    }

    .question-content::before {
      inset-block-start: -50px;
      inset-inline-start: -50px;
    }

    .question-content::after {
      inset-block-end: -50px;
      inset-inline-end: -50px;
    }

    .question-body {
      display: flex;
      flex-direction: column;
      place-content: center;
      text-align: center;
    }

    .question-body:has(app-question-media) {
      gap: 1rem;
    }
  `,
  imports: [QuestionMediaComponent],
})
export class QuestionComponent {
  readonly question = input.required<IPublicQuestion>();
}
