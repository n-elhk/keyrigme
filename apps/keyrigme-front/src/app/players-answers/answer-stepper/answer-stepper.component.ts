import {
  CdkStepper,
  CdkStepperModule,
} from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
import { QuizzSocketService } from '../../shared/services/quizz-socket.service';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-answer-stepper',
  templateUrl: './answer-stepper.component.html',
  styleUrl: './answer-stepper.component.scss',
  providers: [{ provide: CdkStepper, useExisting: AnswerStepperComponent }],
  imports: [NgTemplateOutlet, CdkStepperModule, MatButton]
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
      this.selectedIndexChange$.pipe(
        tap((index) =>
          this.quizzSocketService.indexAnswersChange(this.roomId(), index)
        )
      ).subscribe();
    }
  }
}
