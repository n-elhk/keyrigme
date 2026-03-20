import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CategoryReferentiel } from '@keyrigme/keyrigme-models';


@Injectable({ providedIn: 'root' })
export class QuizzModelService {
  private readonly baseUrl = '/api/quizz';

  readonly countByCategoryRessource = httpResource<(CategoryReferentiel)[]>(() => `${this.baseUrl}/count-by-category`, { defaultValue: [] });
}
