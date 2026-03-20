import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { CategoryReferentiel } from '@keyrigme/keyrigme-models';

@Injectable()
export class QuestionService {
  constructor(@InjectModel(Question.name) private questionModel: Model<QuestionDocument>) { }


  async getQuestion(excludedIds: string[]): Promise<QuestionDocument | null> {
    return this.questionModel.findOne({ _id: { $nin: excludedIds } }).exec();
  }

  async getRandomQuestions(size: number, excludedCategories: string[] = []): Promise<QuestionDocument[]> {
    return this.questionModel.aggregate([
      {
        $match: {
          categories: { $nin: excludedCategories }, // Exclure les documents ayant certaines catégories
        },
      },
      { $sample: { size } }, // Récupère 5 documents au hasard sans doublons
    ]).exec();
  }

  async countByCategory(): Promise<(CategoryReferentiel)[]> {

    const result = await this.questionModel.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          count: 1,
        },
      },
    ]);

    return result;


    // const result = await this.questionModel.aggregate([
    //   { $unwind: '$categories' }, // car c'est un tableau
    //   { $group: { _id: '$categories', count: { $sum: 1 } } },
    // ]);

    // console.log('countByCategory result', result);

    // return result

    // // Transformer en { [category]: count }
    // return result.reduce((acc, curr) => {
    //   acc[curr._id] = { id: curr._id, count: curr.count };
    //   return acc;
    // }, {});
  }


}


