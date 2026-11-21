import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'cf-avatar',
  template: `
    <div class="avatar-container">
      <div class="avatar-icon-start">
        <ng-content select="[avatar-icon-start]"></ng-content>
      </div>

      <img
        class="avatar"
        [ngSrc]="src()"
        [width]="width()"
        [height]="height()"
        alt="" />

      <div class="avatar-icon-end">
        <ng-content select="[avatar-icon-end]"></ng-content>
      </div>
    </div>
  `,
  styles: `
    .avatar-container {
      position: relative;
    }

    .avatar {
      border: 5px solid #fff;
      border-radius: 100%;
    }

    .avatar-icon-start {
      position: absolute;
      inset-block-end: 0;
      inset-inline-start: 0;
    }

    .avatar-icon-end {
      position: absolute;
      inset-block-end: 0;
      inset-inline-end: 0;
    }
  `,
  encapsulation: ViewEncapsulation.None,
  imports: [NgOptimizedImage],
  host: {
    class: 'cf-avatar',
  }
})
export class CfAvatar {
  readonly src = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
}
