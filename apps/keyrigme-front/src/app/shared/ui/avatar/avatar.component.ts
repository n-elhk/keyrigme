import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'cf-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
