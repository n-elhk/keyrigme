import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-avatar-stepper',
  template: `
    <section class="avatar-stepper" aria-label="Choix de l'avatar">
      <div>
        @if (selectedIndex !== 0) {
          <button
            type="button"
            mat-icon-button
            cdkStepperPrevious
            aria-label="Avatar précédent"
          >
            <mat-icon fontIcon="arrow_back" aria-hidden="true" />
          </button>
        }
      </div>

      <div>
        <div [ngTemplateOutlet]="selected ? selected.content : null"></div>
        <p class="visually-hidden" aria-live="polite">
          Avatar {{ selectedIndex + 1 }} sur {{ steps.length }}
        </p>
      </div>

      <div>
        @if (selectedIndex + 1 !== steps.length) {
          <button
            type="button"
            mat-icon-button
            cdkStepperNext
            aria-label="Avatar suivant"
          >
            <mat-icon fontIcon="arrow_forward" aria-hidden="true" />
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .avatar-stepper {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0.5rem;
      place-items: center;
    }
  `,
  providers: [{ provide: CdkStepper, useExisting: AvatarStepperComponent }],
  imports: [CdkStepperModule, NgTemplateOutlet, MatIconButton, MatIcon],
})
export class AvatarStepperComponent extends CdkStepper {}
