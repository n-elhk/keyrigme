import { Controller, Get, Logger } from '@nestjs/common';
import { QuestionService } from './services/question.service';
import {
  MediaTypes,
  QuestionCategories,
  QuestionTypes,
  QuestionWithoutId,
} from '@keyrigme/keyrigme-models';

const NOW = new Date().toISOString();

const SEED_QUESTIONS: QuestionWithoutId[] = [
  // --- Images (grille 1 image) ---
  {
    title: "Qui a construit l'arche selon la Bible ?",
    answer: 'Noé',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [
      'https://upload.wikimedia.org/wikipedia/commons/2/23/Noahs_Ark.jpg',
    ],
    timer: 15000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  // --- Images (grille 2 images) ---
  {
    title: "Quel événement biblique est représenté sur ces images ?",
    answer: 'La Création',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [
      'https://upload.wikimedia.org/wikipedia/commons/0/0c/Creation_of_Adam_Michelangelo.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/0c/Creation_of_Adam_Michelangelo.jpg',
    ],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  // --- Images (grille 4 images) ---
  {
    title: "Quel apôtre est représenté sur chacune de ces icônes ?",
    answer: 'Pierre, Paul, Jean, Jacques',
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [
      'https://upload.wikimedia.org/wikipedia/commons/6/68/Guido_Reni_031.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/68/Guido_Reni_031.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/68/Guido_Reni_031.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/68/Guido_Reni_031.jpg',
    ],
    timer: 30000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  // --- Audio (2 extraits) ---
  {
    title: "Quel est ce chant liturgique ?",
    answer: 'Le Kyrie',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Audio,
    files: [
      'https://file-examples.com/storage/fe62c5756f6a1db2995ead3/2017/11/file_example_OOG_1MG.ogg',
      'https://file-examples.com/storage/fe62c5756f6a1db2995ead3/2017/11/file_example_OOG_1MG.ogg',
    ],
    timer: 25000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  // --- Reste (sans fichiers) ---
  {
    title: 'Dans quelle ville Jésus est-il né ?',
    answer: 'Bethléem',
    point: 1,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Combien d'apôtres Jésus a-t-il choisis ?",
    answer: '12',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Quel père de l'Église a écrit les Confessions ?",
    answer: 'Saint Augustin',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Qui est l'auteur de la Somme Théologique ?",
    answer: "Saint Thomas d'Aquin",
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "En quelle année a eu lieu le Grand Schisme d'Orient ?",
    answer: '1054',
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Quel concile a défini le dogme de l'Immaculée Conception ?",
    answer: "Ce n'est pas un concile mais le pape Pie IX en 1854",
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 25000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: 'Quel saint est le patron de la France ?',
    answer: 'Saint Denis',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 15000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Sainte Thérèse de l'Enfant-Jésus est originaire de quelle ville ?",
    answer: 'Alençon',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Combien de sacrements compte l'Église catholique ?",
    answer: '7',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: "Quel est le premier sacrement de l'initiation chrétienne ?",
    answer: 'Le baptême',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 10000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    title: 'Combien de livres compte la Bible catholique ?',
    answer: '73',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    files: [],
    timer: 20000,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

@Controller('quizz')
export class QuizzController {
  private readonly logger = new Logger(QuizzController.name);

  constructor(private readonly questionService: QuestionService) {}

  @Get('count-by-category')
  async getCountByCategory() {
    this.logger.log('Fetching count by category');
    return this.questionService.countByCategory();
  }

  @Get('seed')
  async seed() {
    this.logger.log('Seeding questions');
    const questions = await this.questionService.insertMany(SEED_QUESTIONS);
    return { inserted: questions.length };
  }

  @Get('reset')
  async reset() {
    this.logger.log('Resetting questions');
    await this.questionService.deleteAll();
    const questions = await this.questionService.insertMany(SEED_QUESTIONS);
    return { deleted: true, inserted: questions.length };
  }
}
