import {
  CdkStepper,
  CdkStepperModule,
} from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { QuizzRpcService } from '../../shared/services/quizz-rpc.service';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-answer-stepper',
  template: `
    <section>
      <div [ngTemplateOutlet]="selected ? selected.content : null"></div>

      <footer>
        @if (selectedIndex + 1 !== steps.length && isOwner()) {
          <button type="button" mat-flat-button cdkStepperNext>
            Suivant
          </button>
        }
      </footer>
    </section>
  `,
  providers: [{ provide: CdkStepper, useExisting: AnswerStepperComponent }],
  imports: [NgTemplateOutlet, CdkStepperModule, MatButton]
})
export class AnswerStepperComponent extends CdkStepper implements OnInit {
  private readonly quizzRpcService = inject(QuizzRpcService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly isOwner = input.required<boolean>();

  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  ngOnInit(): void {
    if (this.isOwner()) {
      this.selectedIndexChange$.pipe(
        tap((index) =>
          void this.quizzRpcService.indexAnswersChange(index)
        ),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe();
    }
  }
}
