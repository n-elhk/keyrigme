import {
  CdkStep,
  CdkStepper,
  CdkStepperModule,
} from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChildren,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { CircleProgressBarComponent } from '../../shared/ui/circle-progress-bar/circle-progress-bar.component';
import { countdown } from '../../shared/utils/rxjs/countdown.rx';
import { timeToPercent } from '../../shared/utils/functions/number.fn';
import { outputToObservable, takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, EMPTY, filter, Observable, startWith, switchMap, tap } from 'rxjs';

const GUIDES_TIME = 8_000;

@Component({
  selector: 'app-game-guide-stepper',
  template: `
    <section class="guides-stepper-container">
      <div [attr.aria-live]="paused() ? 'polite' : 'off'">
        <div [ngTemplateOutlet]="selected ? selected.content : null"></div>
      </div>

      <div class="progress-bar-items" role="group" aria-label="Étapes du guide">
        @for (child of cdkStepChildren(); let i = $index; track i) {
          <button
            type="button"
            class="step-button"
            [attr.aria-label]="'Étape ' + (i + 1) + ' sur ' + cdkStepChildren().length"
            [attr.aria-current]="selectedIndex === i ? 'step' : null"
            (click)="selectStepWithIndex(i)"
          >
            <cf-circle-progress-bar
              [size]="40"
              [percent]="selectedIndex === i ? percent() : 0"
            />
          </button>
        }
      </div>

      <div class="guide-controls">
        <button type="button" mat-button (click)="togglePause()">
          {{ paused() ? 'Reprendre le défilement' : 'Mettre en pause' }}
        </button>
      </div>
    </section>
  `,
  styles: `
    .progress-bar-items {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .step-button {
      display: inline-grid;
      place-items: center;
      min-inline-size: 44px;
      min-block-size: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
    }

    .step-button:focus-visible {
      outline: var(--focus-ring);
      outline-offset: var(--focus-ring-offset);
    }

    .guide-controls {
      display: flex;
      justify-content: center;
    }
  `,
  providers: [{ provide: CdkStepper, useExisting: GameGuideStepperComponent }],
  imports: [NgTemplateOutlet, CdkStepperModule, CircleProgressBarComponent, MatButton]
})
export class GameGuideStepperComponent extends CdkStepper implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  /** Lets users stop the auto-advance (WCAG 2.2.2 Pause, Stop, Hide). */
  readonly paused = signal(false);

  private readonly countdown$ = combineLatest([
    this.selectedIndexChange$.pipe(startWith(this.selectedIndex)),
    toObservable(this.paused),
  ]).pipe(
    switchMap(([, paused]) => (paused ? EMPTY : countdown(GUIDES_TIME, 50)))
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

  togglePause() {
    this.paused.update(paused => !paused);
  }
}
