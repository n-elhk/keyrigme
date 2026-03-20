import { Controller, Get } from '@nestjs/common';
import { QuestionService } from './services/question.service';


@Controller('quizz')
export class QuizzController {
  constructor(
    private readonly questionService: QuestionService
  ) { }
  
  @Get('count-by-category')
  async getCountByCategory() {
    console.log('Fetching count by category');
    return this.questionService.countByCategory();
  }
}
