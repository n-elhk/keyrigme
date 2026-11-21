import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, model } from '@angular/core';
import { IOrderItem } from '@keyrigme/models';
import { OrderItemCardComponent } from '../order-item-card/order-item-card.component';

/**
 * Answer of an `Order` question: the player sorts the cards by drag and drop,
 * or with the move buttons when using a keyboard or a screen reader.
 */
@Component({
  selector: 'app-order-answer',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, OrderItemCardComponent],
  template: `
    <p class="instruction" id="order-instruction">
      Glisse les cartes, ou utilise les flèches, pour les remettre dans l'ordre.
    </p>
    <ol
      class="cards"
      cdkDropList
      aria-describedby="order-instruction"
      [cdkDropListDisabled]="disabled()"
      (cdkDropListDropped)="drop($event)">
      @for (item of sortedItems(); track item.id; let index = $index, first = $first, last = $last) {
        <li class="card" cdkDrag>
          <span class="handle" cdkDragHandle aria-hidden="true">⠿</span>
          <app-order-item-card [item]="item" [position]="index + 1" />
          <span class="moves">
            <button
              type="button"
              [disabled]="disabled() || first"
              [attr.aria-label]="'Monter ' + item.label"
              (click)="move(index, index - 1)">
              ↑
            </button>
            <button
              type="button"
              [disabled]="disabled() || last"
              [attr.aria-label]="'Descendre ' + item.label"
              (click)="move(index, index + 1)">
              ↓
            </button>
          </span>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
    }

    .instruction {
      margin: 0 0 0.75rem;
      text-align: center;
    }

    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border: 2px solid var(--color-accent);
      border-radius: var(--radius-medium);
      background-color: var(--color-question-bg);
      color: var(--color-question-text);
    }

    .handle {
      cursor: grab;
      font-size: 1.5rem;
      line-height: 1;
    }

    app-order-item-card {
      flex: 1;
    }

    .moves {
      display: flex;
      gap: 0.25rem;
    }

    .moves button {
      min-width: 2.75rem;
      min-height: 2.75rem;
      border: 1px solid currentColor;
      border-radius: var(--radius-small);
      background: transparent;
      color: inherit;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .moves button:focus-visible {
      outline: var(--focus-ring);
      outline-offset: var(--focus-ring-offset);
    }

    .moves button:disabled {
      cursor: default;
      opacity: 0.4;
    }

    .cdk-drag-preview {
      box-shadow: 0 8px 16px rgb(0 0 0 / 40%);
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    @media (prefers-reduced-motion: no-preference) {
      .cdk-drag-animating,
      .cards.cdk-drop-list-dragging .card:not(.cdk-drag-placeholder) {
        transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `,
})
export class OrderAnswerComponent {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  readonly items = input.required<ReadonlyArray<IOrderItem>>();
  /** Item ids in the order chosen by the player. */
  readonly order = model.required<ReadonlyArray<string>>();
  readonly disabled = input(false);

  readonly sortedItems = computed(() => {
    const byId = new Map(this.items().map((item) => [item.id, item]));
    return this.order().flatMap((id) => byId.get(id) ?? []);
  });

  drop({ previousIndex, currentIndex }: CdkDragDrop<unknown>) {
    this.move(previousIndex, currentIndex);
  }

  move(from: number, to: number) {
    if (from === to) return;
    const order = [...this.order()];
    moveItemInArray(order, from, to);
    this.order.set(order);
    const label = this.sortedItems()[to]?.label;
    void this.liveAnnouncer.announce(`${label} déplacé en position ${to + 1} sur ${order.length}`);
  }
}
