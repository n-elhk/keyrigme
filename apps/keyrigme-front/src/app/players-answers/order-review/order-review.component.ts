import { Component, computed, input } from '@angular/core';
import { IOrderQuestion, PlayerResponse } from '@keyrigme/models';
import { OrderItemCardComponent } from '../../shared/components/order-item-card/order-item-card.component';

/**
 * Compares the order submitted by a player with the right one.
 * For information only: the room owner still decides whether the answer is right.
 */
@Component({
  selector: 'app-order-review',
  imports: [OrderItemCardComponent],
  template: `
    <div class="columns">
      <section aria-labelledby="submitted-order">
        <h2 id="submitted-order">Ordre du joueur</h2>
        @if (submitted().length > 0) {
          <ol>
            @for (entry of submitted(); track entry.item.id; let index = $index) {
              <li class="card" [class.right]="entry.right" [class.wrong]="!entry.right">
                <app-order-item-card [item]="entry.item" [position]="index + 1" />
                <span class="verdict">{{ entry.right ? 'Bien placé' : 'Mal placé' }}</span>
              </li>
            }
          </ol>
        } @else {
          <p>Pas de réponse</p>
        }
      </section>

      <section aria-labelledby="expected-order">
        <h2 id="expected-order">Ordre attendu</h2>
        <ol>
          @for (item of expected(); track item.id; let index = $index) {
            <li class="card right">
              <app-order-item-card [item]="item" [position]="index + 1" />
            </li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1rem;
      width: 100%;
    }

    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      text-align: center;
    }

    ol {
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
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 3px solid;
      border-radius: var(--radius-medium);
      background-color: var(--color-surface-strong);
      color: var(--color-page-text);
    }

    .right {
      border-color: var(--color-success);
    }

    .wrong {
      border-color: var(--color-danger);
    }

    .verdict {
      font-size: 0.875rem;
    }

    .wrong .verdict {
      color: var(--color-danger-text);
    }

    .right .verdict {
      color: var(--color-success-text);
    }
  `,
})
export class OrderReviewComponent {
  readonly question = input.required<IOrderQuestion>();
  readonly response = input.required<PlayerResponse>();

  private readonly itemsById = computed(() => new Map(this.question().items.map((item) => [item.id, item])));

  readonly expected = computed(() => this.question().answer.flatMap((id) => this.itemsById().get(id) ?? []));

  /** The player's cards, each flagged by whether it sits at its expected position. */
  readonly submitted = computed(() => {
    const response = this.response();
    if (typeof response === 'string') return [];
    const answer = this.question().answer;
    return response.flatMap((id, index) => {
      const item = this.itemsById().get(id);
      return item ? [{ item, right: answer[index] === id }] : [];
    });
  });
}
