import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { QuizzSocketService } from '../../shared/services/quizz-socket.service';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';

@Component({
  selector: 'app-answer-stepper',
  template: `
    <div class="flex flex-col gap-4">
      <div [ngTemplateOutlet]="selected ? selected.content : null"></div>

      @if (selectedIndex + 1 !== steps.length && isOwner()) {
        <div class="flex justify-end px-4">
          <button
            type="button"
            class="neo-btn-yellow py-2 px-6 text-sm"
            cdkStepperNext>
            Suivant →
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: CdkStepper, useExisting: AnswerStepperComponent }],
  imports: [NgTemplateOutlet, CdkStepperModule],
})
export class AnswerStepperComponent extends CdkStepper implements OnInit {
  private readonly quizzSocketService = inject(QuizzSocketService);

  readonly roomId = input.required<string>();
  readonly isOwner = input.required<boolean>();

  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  ngOnInit(): void {
    if (this.isOwner()) {
      this.selectedIndexChange$
        .pipe(
          tap((index) =>
            this.quizzSocketService.indexAnswersChange(this.roomId(), index)
          )
        )
        .subscribe();
    }
  }
}
