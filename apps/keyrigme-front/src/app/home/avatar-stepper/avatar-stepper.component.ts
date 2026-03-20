import {
  CdkStepper,
  CdkStepperModule,
} from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-avatar-stepper',
  templateUrl: './avatar-stepper.component.html',
  styleUrl: './avatar-stepper.component.scss',
  providers: [{ provide: CdkStepper, useExisting: AvatarStepperComponent }],
  imports: [CdkStepperModule, NgTemplateOutlet, MatIconButton, MatIcon]
})
export class AvatarStepperComponent extends CdkStepper implements OnInit {

  private readonly selectedIndexChange$ = outputToObservable(
    this.selectedIndexChange
  ) as Observable<number>;

  ngOnInit(): void {
    this.selectedIndexChange$.pipe().subscribe();
  }
}
