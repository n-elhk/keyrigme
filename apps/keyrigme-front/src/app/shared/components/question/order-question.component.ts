import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { IOrderItem, IOrderQuestion } from '@keyrigme/keyrigme-models';
import { shuffle } from '../../utils/functions/array.fn';

@Component({
  selector: 'app-order-question',
  template: `
    <div class="px-4">
      <p class="text-xs text-black/50 text-center mb-3 font-medium">
        Glisse les cartes pour les ordonner
      </p>
      <div
        cdkDropList
        class="flex flex-col gap-2"
        (cdkDropListDropped)="drop($event)">
        @for (item of orderedItems(); track item._id) {
          <div
            cdkDrag
            class="neo-card p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing">
            <span cdkDragHandle class="text-xl text-black/30 shrink-0 cursor-grab" aria-hidden="true">⠿</span>
            <div class="relative w-9 h-9 border-2 border-black overflow-hidden shrink-0">
              <img [ngSrc]="item.file" fill alt="" class="object-cover" />
            </div>
            <span class="text-sm font-bold">{{ item.label }}</span>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NgOptimizedImage],
})
export class OrderQuestionComponent {
  readonly question = input.required<IOrderQuestion>();
  readonly orderedIds = model<string[]>([]);

  readonly orderedItems = linkedSignal(() => shuffle([...this.question().orderItems]));

  constructor() {
    effect(() => {
      const _ = this.question();
      untracked(() => this.orderedIds.set(this.orderedItems().map((i) => i._id)));
    });
  }

  drop(event: CdkDragDrop<IOrderItem[]>): void {
    const items = [...this.orderedItems()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.orderedItems.set(items);
    this.orderedIds.set(items.map((i) => i._id));
  }
}
