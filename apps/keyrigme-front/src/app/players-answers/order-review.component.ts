import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IOrderItem, IOrderQuestion } from '@keyrigme/keyrigme-models';

@Component({
  selector: 'app-order-review',
  template: `
    <div class="grid grid-cols-2 gap-3 px-4">
      <div>
        <p class="text-xs font-black tracking-[2px] uppercase text-black/60 mb-2">Ordre soumis</p>
        <div class="flex flex-col gap-2">
          @for (item of submittedOrder(); track item._id; let i = $index) {
            <div
              class="neo-card p-2 flex items-center gap-2 border-[2px]"
              [class.border-red-500]="!isCorrectPosition(i, item._id)"
              [class.border-black]="isCorrectPosition(i, item._id)">
              <div class="relative w-7 h-7 border border-black overflow-hidden shrink-0">
                <img [ngSrc]="item.file" fill alt="" class="object-cover" />
              </div>
              <span class="text-xs font-bold">{{ item.label }}</span>
            </div>
          }
        </div>
      </div>
      <div>
        <p class="text-xs font-black tracking-[2px] uppercase text-green-700 mb-2">Ordre correct</p>
        <div class="flex flex-col gap-2">
          @for (item of correctOrder(); track item._id) {
            <div class="neo-card p-2 flex items-center gap-2 border-[2px] border-green-500">
              <div class="relative w-7 h-7 border border-black overflow-hidden shrink-0">
                <img [ngSrc]="item.file" fill alt="" class="object-cover" />
              </div>
              <span class="text-xs font-bold">{{ item.label }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class OrderReviewComponent {
  readonly question = input.required<IOrderQuestion>();
  readonly responseJson = input.required<string>();

  readonly submittedOrder = computed<IOrderItem[]>(() => {
    try {
      const ids: string[] = JSON.parse(this.responseJson());
      const itemMap = new Map(this.question().orderItems.map((i) => [i._id, i]));
      return ids.map((id) => itemMap.get(id)).filter(Boolean) as IOrderItem[];
    } catch {
      return [];
    }
  });

  readonly correctOrder = computed<IOrderItem[]>(() => {
    const itemMap = new Map(this.question().orderItems.map((i) => [i._id, i]));
    return this.question().answer.map((id) => itemMap.get(id)).filter(Boolean) as IOrderItem[];
  });

  isCorrectPosition(index: number, itemId: string): boolean {
    return this.question().answer[index] === itemId;
  }
}
