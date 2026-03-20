import { MediaTypes, QuestionCategories, QuestionTypes } from '../constants';

export type MediaTypesValues = keyof typeof MediaTypes;
export type QuestionTypesValues = keyof typeof QuestionTypes;
export type QuestionCategoriesValues = keyof typeof QuestionCategories;

export interface IQuestion {
  _id: string;
  title: string;
  point: number;
  timer: number;
  categories: QuestionCategoriesValues[];
  answer: string;
  file: string;
  mediaType: MediaTypesValues;
  type: (typeof QuestionTypes)['Media'];
  createdAt: string;
  updatedAt: string;
}

export type QuestionWithoutId = Omit<IQuestion, '_id'>;

export type CategoryReferentiel = {
  id: QuestionCategoriesValues;
  label: string;
  count: number;
};
