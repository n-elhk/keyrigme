import { ChangeDetectionStrategy, booleanAttribute, Component, input, model } from '@angular/core';
import {
  CATEGORIES_RULES,
  CATEGORIES_VALUES,
  QuestionCategoriesValues,
} from '@keyrigme/keyrigme-models';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-categories-selector',
  template: `
    <div class="flex flex-wrap gap-2">
      @for (item of options(); track $index) {
        <button
          type="button"
          class="neo-btn border-[2px] border-black px-3 py-1.5 text-xs transition-colors"
          [class]="isChecked(item)
            ? 'bg-yellow text-black shadow-[2px_2px_0_#000]'
            : 'bg-white text-black shadow-[2px_2px_0_#000]'"
          [disabled]="disabled() || atLeastOneRequired(item)"
          [attr.aria-pressed]="isChecked(item)"
          (click)="optionChange(item)">
          {{ CATEGORIES_RULES[item].label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class CategoriesSelectorComponent
  implements FormValueControl<QuestionCategoriesValues[]>
{
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly value = model<QuestionCategoriesValues[]>([]);
  readonly options = input(CATEGORIES_VALUES);
  readonly CATEGORIES_RULES = CATEGORIES_RULES;

  optionChange(option: QuestionCategoriesValues): void {
    const value = this.value();
    const present = value.includes(option);
    const next = present ? value.filter((v) => v !== option) : [...value, option];
    if (next.length === 0) return;
    this.value.set(next);
  }

  isChecked(value: QuestionCategoriesValues): boolean {
    return this.value().includes(value);
  }

  atLeastOneRequired(value: QuestionCategoriesValues): boolean {
    return this.isChecked(value) && this.value().length === 1;
  }
}
