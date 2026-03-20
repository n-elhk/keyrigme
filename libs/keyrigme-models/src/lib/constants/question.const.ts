export const QuestionTypes = {
  Text: 'Text',
  Media: 'Media',
  Order: 'Order',
} as const;

export const MediaTypes = {
  Audio: 'Audio',
  Image: 'Image',
} as const;

export const QuestionCategories = {
  OLD_TESTIMONY: 'OLD_TESTIMONY',
  CHURCH_FATHERS: 'CHURCH_FATHERS',
  NEW_TESTIMONY: 'NEW_TESTIMONY',
  TRADITION: 'TRADITION',
  HISTORY: 'HISTORY',
  SAINT: 'SAINT',
} as const;

export const CATEGORIES_RULES = {
  [QuestionCategories.OLD_TESTIMONY]: {
    label: 'Ancien testament',
  },
  [QuestionCategories.NEW_TESTIMONY]: {
    label: 'Nouveau testament',
  },
  [QuestionCategories.CHURCH_FATHERS]: {
    label: `Père de l'Eglise`,
  },
  [QuestionCategories.HISTORY]: {
    label: 'Histoire',
  },
  [QuestionCategories.SAINT]: {
    label: 'Saints',
  },
  [QuestionCategories.TRADITION]: {
    label: 'Traditions',
  },
} as const;

export const CATEGORIES_VALUES = Object.values(QuestionCategories);
