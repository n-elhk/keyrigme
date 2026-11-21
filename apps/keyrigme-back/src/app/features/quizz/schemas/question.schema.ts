import { QuestionCategories, QuestionTypes } from '@keyrigme/keyrigme-models';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ discriminatorKey: 'type' })
export class Question {
  @Prop({ type: String, required: true })
  public title: string;

  @Prop({ type: Number, required: true, default: 3 })
  public point: number;

  @Prop({ type: Number, default: 10_000 })
  public timer: number;

  @Prop({
    type: [String],
    default: [QuestionCategories.OLD_TESTIMONY, QuestionCategories.NEW_TESTIMONY],
  })
  public categories: string[];

  @Prop({
    type: String,
    enum: Object.values(QuestionTypes),
    required: true,
  })
  public type: string;

  @Prop({ default: () => new Date().toISOString() })
  public createdAt: string;

  @Prop({ default: () => new Date().toISOString() })
  public updatedAt: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
