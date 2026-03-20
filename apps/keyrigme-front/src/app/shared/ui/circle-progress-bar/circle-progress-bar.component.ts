import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'cf-circle-progress-bar',
  standalone: true,
  templateUrl: './circle-progress-bar.component.html',
  styleUrls: ['./circle-progress-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cf-circle-progress-bar',
  },
})
export class CircleProgressBarComponent {
  readonly percent = input.required<number>();

  readonly size = input<number>(80);

  readonly textSize = input({ width: 10, height: 16, fontSize: '18px' });

  readonly xText = computed(
    () => `${Math.round(this.size() / 2 - this.textSize().width / 1.75)}px`
  );

  readonly yText = computed(
    () => `${Math.round(this.size() / 2 - this.textSize().height / 3.25)}px`
  );

  readonly text = input<string | number>();

  readonly tranformValue = input<() => unknown>();

  readonly radius = computed(() => this.size() / 2 - 10);

  readonly circumference = computed(() => 3.14 * this.radius() * 2);

  readonly textTranform = computed(
    () => `rotate(90deg) translate(0px, -${this.size() - 4}px)`
  );

  readonly viewBox = computed(
    () =>
      `${-(this.size() * 0.125)} ${-(this.size() * 0.125)} ${this.size() * 1.25} ${this.size() * 1.25}`
  );

  readonly percentage = computed(
    () =>
      `${Math.round(this.circumference() * ((100 - this.percent()) / 100))}px`
  );
}
