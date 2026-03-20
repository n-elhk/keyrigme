import { computed, inject, Injectable } from '@angular/core';
import { QuizzModelService } from './quizz-model.service';
import { CategoryReferentiel, QuestionCategoriesValues } from '@keyrigme/keyrigme-models';

@Injectable({ providedIn: 'root' })
export class ReferentielService {
  private readonly quizzModelService = inject(QuizzModelService);

  readonly countByCategoryRessource = this.quizzModelService.countByCategoryRessource.asReadonly();

  readonly categoriesIds = computed(() => {
    const categories = this.countByCategoryRessource.value();
    return categories.map(({ id }) => id);
  });

  readonly categoriesMapped = computed(() => {
    const categories = this.countByCategoryRessource.value();
    return Object.fromEntries(categories.map((c) => [c.id, c])) as Record<QuestionCategoriesValues, CategoryReferentiel>;
  });

}
