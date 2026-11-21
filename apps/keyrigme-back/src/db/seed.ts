import type { NonEmptyReadonlyArray } from 'effect/Array';
import {
  MediaTypes,
  QuestionCategories,
  QuestionTypes,
  type IOrderItem,
  type QuestionCategoriesValues,
  type QuestionWithoutId,
} from '@keyrigme/models';

type Categories = ReadonlyArray<QuestionCategoriesValues>;

const question = (
  title: string,
  answer: string,
  point: number,
  timer: number,
  categories: Categories,
): QuestionWithoutId => ({ title, answer, point, timer, categories, type: QuestionTypes.Text });

const image = (
  title: string,
  files: ReadonlyArray<string>,
  answer: string,
  point: number,
  timer: number,
  categories: Categories,
): QuestionWithoutId => ({
  title,
  answer,
  point,
  timer,
  categories,
  type: QuestionTypes.Media,
  mediaType: MediaTypes.Image,
  files,
});

/** `items` are given in the right order; they are shuffled when the round is sent. */
const order = (
  title: string,
  items: ReadonlyArray<Omit<IOrderItem, 'file'> & { file?: string }>,
  point: number,
  timer: number,
  categories: Categories,
): QuestionWithoutId => ({
  title,
  point,
  timer,
  categories,
  type: QuestionTypes.Order,
  items: items.map(({ file = '', ...item }) => ({ ...item, file })),
  answer: items.map((item) => item.id),
});

const WIKIMEDIA = 'https://upload.wikimedia.org/wikipedia/commons/thumb';

export const SEED_QUESTIONS: NonEmptyReadonlyArray<QuestionWithoutId> = [
  question("Qui a construit l'arche selon la Bible ?", 'Noé', 3, 15000, [QuestionCategories.OLD_TESTIMONY]),
  question('Combien de jours Dieu a-t-il mis pour créer le monde ?', '6 jours', 2, 15000, [QuestionCategories.OLD_TESTIMONY]),
  question('Quel est le premier livre de la Bible ?', 'La Genèse', 2, 10000, [QuestionCategories.OLD_TESTIMONY]),
  question('Qui a écrit les évangiles de Matthieu, Marc, Luc et Jean ?', 'Les quatre évangélistes', 3, 15000, [QuestionCategories.NEW_TESTIMONY]),
  question('Dans quelle ville Jésus est-il né ?', 'Bethléem', 1, 10000, [QuestionCategories.NEW_TESTIMONY]),
  question("Combien d'apôtres Jésus a-t-il choisis ?", '12', 2, 10000, [QuestionCategories.NEW_TESTIMONY]),
  question("Quel père de l'Église a écrit les Confessions ?", 'Saint Augustin', 4, 20000, [QuestionCategories.CHURCH_FATHERS]),
  question("Qui est l'auteur de la Somme Théologique ?", "Saint Thomas d'Aquin", 4, 20000, [QuestionCategories.CHURCH_FATHERS]),
  question("En quelle année a eu lieu le Grand Schisme d'Orient ?", '1054', 5, 20000, [QuestionCategories.HISTORY]),
  question("Quel concile a défini le dogme de l'Immaculée Conception ?", "Ce n'est pas un concile mais le pape Pie IX en 1854", 5, 25000, [QuestionCategories.HISTORY]),
  question('Quel saint est le patron de la France ?', 'Saint Denis', 3, 15000, [QuestionCategories.SAINT]),
  question("Sainte Thérèse de l'Enfant-Jésus est originaire de quelle ville ?", 'Alençon', 4, 20000, [QuestionCategories.SAINT]),
  question("Combien de sacrements compte l'Église catholique ?", '7', 2, 10000, [QuestionCategories.TRADITION]),
  question("Quel est le premier sacrement de l'initiation chrétienne ?", 'Le baptême', 2, 10000, [QuestionCategories.TRADITION]),
  question('Combien de livres compte la Bible catholique ?', '73', 4, 20000, [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY]),
  image(
    'Quel épisode de la Genèse cette fresque représente-t-elle ?',
    [`${WIKIMEDIA}/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/960px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg`],
    "La création d'Adam",
    3,
    20000,
    [QuestionCategories.OLD_TESTIMONY],
  ),
  image(
    'Quel repas cette œuvre de Léonard de Vinci représente-t-elle ?',
    [`${WIKIMEDIA}/0/08/Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg/960px-Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg`],
    'La Cène',
    2,
    15000,
    [QuestionCategories.NEW_TESTIMONY],
  ),
  order(
    'Remets ces personnages dans l\'ordre chronologique',
    [
      { id: 'abraham', label: 'Abraham' },
      { id: 'moise', label: 'Moïse' },
      { id: 'david', label: 'David' },
      { id: 'jean-baptiste', label: 'Jean-Baptiste' },
    ],
    4,
    25000,
    [QuestionCategories.OLD_TESTIMONY],
  ),
  order(
    'Remets les livres du Pentateuque dans l\'ordre',
    [
      { id: 'genese', label: 'Genèse' },
      { id: 'exode', label: 'Exode' },
      { id: 'levitique', label: 'Lévitique' },
      { id: 'nombres', label: 'Nombres' },
      { id: 'deuteronome', label: 'Deutéronome' },
    ],
    4,
    25000,
    [QuestionCategories.OLD_TESTIMONY],
  ),
];
