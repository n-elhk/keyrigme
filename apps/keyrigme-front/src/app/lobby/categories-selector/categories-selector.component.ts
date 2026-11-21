import { booleanAttribute, Component, input, model } from '@angular/core';
import {
  CATEGORIES_RULES,
  CATEGORIES_VALUES,
  QuestionCategoriesValues,
} from '@keyrigme/models';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-categories-selector',
  template: `
    <fieldset class="categories">
      <legend>Catégories</legend>
      @for (item of options(); track item) {
        <div>
          <mat-checkbox
            [checked]="isChecked(item)"
            [disabled]="disabled() || atLeastOneRequired(item)"
            (change)="optionChange(item)"
            [value]="item"
          >
            {{ CATEGORIES_RULES[item].label }}
          </mat-checkbox>
        </div>
      }
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
    }

    .categories {
      margin: 0;
      padding: 0;
      border: 0;
    }

    .categories legend {
      padding: 0;
      margin-block-end: 0.25rem;
    }
  `,
  imports: [MatCheckbox],
})
export class CategoriesSelectorComponent
  implements FormValueControl<ReadonlyArray<QuestionCategoriesValues>>
{
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly value = model<ReadonlyArray<QuestionCategoriesValues>>([]);
  readonly options = input(CATEGORIES_VALUES);
  readonly CATEGORIES_RULES = CATEGORIES_RULES;

  optionChange(option: QuestionCategoriesValues): void {
    const value = this.value();
    const present = value.includes(option);
    const next = present ? value.filter(v => v !== option) : [...value, option];

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
