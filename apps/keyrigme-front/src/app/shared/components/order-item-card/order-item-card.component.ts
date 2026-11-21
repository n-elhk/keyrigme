import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { IOrderItem } from '@keyrigme/models';

/** Content of an `Order` card: its position, its optional illustration and its label. */
@Component({
  selector: 'app-order-item-card',
  imports: [NgOptimizedImage],
  template: `
    <span class="position">{{ position() }}.</span>
    @if (item().file) {
      <img [ngSrc]="item().file" width="64" height="64" alt="" />
    }
    <span class="label">{{ item().label }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .position {
      min-width: 1.5rem;
      font-weight: bold;
    }

    img {
      object-fit: cover;
      border-radius: 8px;
    }
  `,
})
export class OrderItemCardComponent {
  readonly item = input.required<IOrderItem>();
  readonly position = input.required<number>();
}
