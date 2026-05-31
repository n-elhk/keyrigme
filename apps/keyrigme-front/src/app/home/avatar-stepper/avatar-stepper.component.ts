import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-avatar-stepper',
  template: `
    <div class="flex items-center justify-center gap-4 py-2">
      <button
        type="button"
        class="neo-btn-black w-10 h-10 flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        [disabled]="selectedIndex === 0"
        cdkStepperPrevious
        aria-label="Avatar précédent">
        ←
      </button>
      <div class="flex-1 flex justify-center">
        <div [ngTemplateOutlet]="selected ? selected.content : null"></div>
      </div>
      <button
        type="button"
        class="neo-btn-black w-10 h-10 flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        [disabled]="selectedIndex + 1 === steps.length"
        cdkStepperNext
        aria-label="Avatar suivant">
        →
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: CdkStepper, useExisting: AvatarStepperComponent }],
  imports: [CdkStepperModule, NgTemplateOutlet],
})
export class AvatarStepperComponent extends CdkStepper implements OnInit {
  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  ngOnInit(): void {
    this.selectedIndexChange$.subscribe();
  }
}
