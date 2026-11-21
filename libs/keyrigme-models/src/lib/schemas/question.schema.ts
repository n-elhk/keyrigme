import { Schema } from 'effect';
import { CATEGORIES_VALUES, MediaTypes, QuestionTypes } from '../constants';

export const QuestionCategory = Schema.Literals(CATEGORIES_VALUES);
export type QuestionCategoriesValues = typeof QuestionCategory.Type;

export const MediaType = Schema.Literals(Object.values(MediaTypes));
export type MediaTypesValues = typeof MediaType.Type;

export const QuestionType = Schema.Literals(Object.values(QuestionTypes));
export type QuestionTypesValues = typeof QuestionType.Type;

/** A card the player has to put in the right position. `id` is unique within its question. */
export const OrderItem = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  /** Optional illustration, empty when the card is text only. */
  file: Schema.String,
});
export type IOrderItem = typeof OrderItem.Type;

const baseFields = {
  id: Schema.String,
  title: Schema.String,
  point: Schema.Int,
  /** Duration of the round in milliseconds. */
  timer: Schema.Int,
  categories: Schema.Array(QuestionCategory),
};

const textFields = { ...baseFields, type: Schema.Literal(QuestionTypes.Text) };
const mediaFields = {
  ...baseFields,
  type: Schema.Literal(QuestionTypes.Media),
  mediaType: MediaType,
  files: Schema.Array(Schema.String),
};
const orderFields = {
  ...baseFields,
  type: Schema.Literal(QuestionTypes.Order),
  items: Schema.Array(OrderItem),
};

/** Free text answer, checked by the room owner. */
export const TextQuestion = Schema.Struct({ ...textFields, answer: Schema.String });
export type ITextQuestion = typeof TextQuestion.Type;

/** One or more images or audio extracts, with a free text answer. */
export const MediaQuestion = Schema.Struct({ ...mediaFields, answer: Schema.String });
export type IMediaQuestion = typeof MediaQuestion.Type;

/** The player sorts `items`; `answer` holds the item ids in the right order. */
export const OrderQuestion = Schema.Struct({ ...orderFields, answer: Schema.Array(Schema.String) });
export type IOrderQuestion = typeof OrderQuestion.Type;

/** Full question, answer included: only sent once the game is over. */
export const Question = Schema.Union([TextQuestion, MediaQuestion, OrderQuestion]);
export type IQuestion = typeof Question.Type;

/** Question as sent to players during a round: without its answer. */
export const PublicQuestion = Schema.Union([
  Schema.Struct(textFields),
  Schema.Struct(mediaFields),
  Schema.Struct(orderFields),
]);
export type IPublicQuestion = typeof PublicQuestion.Type;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type QuestionWithoutId = DistributiveOmit<IQuestion, 'id'>;

/** Answer of a player: free text, or the ordered item ids of an `Order` question. */
export const PlayerResponse = Schema.Union([Schema.String, Schema.Array(Schema.String)]);
export type PlayerResponse = typeof PlayerResponse.Type;

export const isOrderQuestion = <Q extends IPublicQuestion>(question: Q): question is Extract<Q, { type: 'Order' }> =>
  question.type === QuestionTypes.Order;

export const isMediaQuestion = <Q extends IPublicQuestion>(question: Q): question is Extract<Q, { type: 'Media' }> =>
  question.type === QuestionTypes.Media;

export const toPublicQuestion = (question: IQuestion): IPublicQuestion => {
  const { answer, ...round } = question;
  void answer;
  return round;
};

export const CategoryReferentiel = Schema.Struct({
  id: QuestionCategory,
  count: Schema.Int,
});
export type CategoryReferentiel = typeof CategoryReferentiel.Type;
