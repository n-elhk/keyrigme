import { Controller, Get, Logger } from '@nestjs/common';
import { QuestionService } from './services/question.service';
import { MediaTypes, QuestionCategories, QuestionTypes, QuestionWithoutId } from '@keyrigme/keyrigme-models';

const SEED_QUESTIONS: QuestionWithoutId[] = [
  {
    title: 'Qui a construit l\'arche selon la Bible ?',
    answer: 'Noé',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien de jours Dieu a-t-il mis pour créer le monde ?',
    answer: '6 jours',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel est le premier livre de la Bible ?',
    answer: 'La Genèse',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Qui a écrit les évangiles de Matthieu, Marc, Luc et Jean ?',
    answer: 'Les quatre évangélistes',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Dans quelle ville Jésus est-il né ?',
    answer: 'Bethléem',
    point: 1,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien d\'apôtres Jésus a-t-il choisis ?',
    answer: '12',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel père de l\'Église a écrit les Confessions ?',
    answer: 'Saint Augustin',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Qui est l\'auteur de la Somme Théologique ?',
    answer: 'Saint Thomas d\'Aquin',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.CHURCH_FATHERS],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'En quelle année a eu lieu le Grand Schisme d\'Orient ?',
    answer: '1054',
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel concile a défini le dogme de l\'Immaculée Conception ?',
    answer: 'Ce n\'est pas un concile mais le pape Pie IX en 1854',
    point: 5,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.HISTORY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 25000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel saint est le patron de la France ?',
    answer: 'Saint Denis',
    point: 3,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Sainte Thérèse de l\'Enfant-Jésus est originaire de quelle ville ?',
    answer: 'Alençon',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.SAINT],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien de sacrements compte l\'Église catholique ?',
    answer: '7',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Quel est le premier sacrement de l\'initiation chrétienne ?',
    answer: 'Le baptême',
    point: 2,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.TRADITION],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Combien de livres compte la Bible catholique ?',
    answer: '73',
    point: 4,
    type: QuestionTypes.Media,
    categories: [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY],
    mediaType: MediaTypes.Image,
    file: '',
    timer: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
}
