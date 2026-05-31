import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'cf-avatar',
  template: `
    <div class="relative inline-block">
      <div class="absolute bottom-0 left-0">
        <ng-content select="[avatar-icon-start]"></ng-content>
      </div>
      <img
        class="rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] block"
        [ngSrc]="src()"
        [width]="width()"
        [height]="height()"
        alt="" />
      <div class="absolute bottom-0 right-0">
        <ng-content select="[avatar-icon-end]"></ng-content>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgOptimizedImage],
  host: {
    class: 'cf-avatar',
  },
})
export class CfAvatar {
  readonly src = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
}
