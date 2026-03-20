import { booleanAttribute, Component, input, model } from '@angular/core';
import {
  CATEGORIES_RULES,
  CATEGORIES_VALUES,
  QuestionCategoriesValues,
} from '@keyrigme/keyrigme-models';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-categories-selector',
  templateUrl: './categories-selector.component.html',
  styleUrl: './categories-selector.component.scss',
  imports: [MatCheckbox],
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
