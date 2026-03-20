import {
  CdkStep,
  CdkStepper,
  CdkStepperModule,
} from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { CircleProgressBarComponent } from '../../shared/ui/circle-progress-bar/circle-progress-bar.component';
import { countdown } from '../../shared/utils/rxjs/countdown.rx';
import { timeToPercent } from '../../shared/utils/functions/number.fn';
import { outputToObservable, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, Observable, startWith, switchMap, tap } from 'rxjs';

const GUIDES_TIME = 8_000;

@Component({
    selector: 'app-game-guide-stepper',
    templateUrl: './game-guide-stepper.component.html',
    styleUrl: './game-guide-stepper.component.scss',
    providers: [{ provide: CdkStepper, useExisting: AnswerStepperComponent }],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet, CdkStepperModule, CircleProgressBarComponent]
})
export class AnswerStepperComponent extends CdkStepper implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  private readonly countdown$ = this.selectedIndexChange$.pipe(
    startWith(this.selectedIndex),
    switchMap(() => countdown(GUIDES_TIME, 50))
  );

  private readonly changeStep$ = this.countdown$.pipe(
    filter(value => value === GUIDES_TIME),
    tap(() => this.moveStep())
  );

  readonly countdown = toSignal(this.countdown$, { initialValue: 0 });

  readonly percent = computed(() =>
    timeToPercent(this.countdown(), GUIDES_TIME)
  );

  readonly cdkStepChildren = contentChildren(CdkStep);

  ngOnInit(): void {
    this.changeStep$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  moveStep() {
    if (this.selectedIndex < this.cdkStepChildren().length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
  }

  selectStepWithIndex(index: number) {
    this.selectedIndex = index;
  }
}
