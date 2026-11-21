import { MediaTypes, QuestionCategories, QuestionTypes } from '../constants';

export type MediaTypesValues = keyof typeof MediaTypes;
export type QuestionTypesValues = keyof typeof QuestionTypes;
export type QuestionCategoriesValues = keyof typeof QuestionCategories;

export interface IBaseQuestion {
  _id: string;
  title: string;
  point: number;
  timer: number;
  categories: QuestionCategoriesValues[];
  type: QuestionTypesValues;
  createdAt: string;
  updatedAt: string;
}

export interface IMediaQuestion extends IBaseQuestion {
  type: 'Media';
  mediaType: MediaTypesValues;
  files: string[];
  answer: string;
}

export interface IOrderItem {
  _id: string;
  label: string;
  file: string;
}

export interface IOrderQuestion extends IBaseQuestion {
  type: 'Order';
  orderItems: IOrderItem[];
  answer: string[];
}

export interface ITextQuestion extends IBaseQuestion {
  type: 'Text';
  answer: string;
}

export type IQuestion = IMediaQuestion | IOrderQuestion | ITextQuestion;

export type QuestionWithoutId =
  | Omit<IMediaQuestion, '_id'>
  | Omit<IOrderQuestion, '_id'>
  | Omit<ITextQuestion, '_id'>;

export type CategoryReferentiel = {
  id: QuestionCategoriesValues;
  label: string;
  count: number;
};

export function isMediaQuestion(q: IQuestion): q is IMediaQuestion {
  return q.type === 'Media';
}

export function isOrderQuestion(q: IQuestion): q is IOrderQuestion {
  return q.type === 'Order';
}

export function isTextQuestion(q: IQuestion): q is ITextQuestion {
  return q.type === 'Text';
}
