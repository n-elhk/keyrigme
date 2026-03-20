import {
  QuestionWithoutId,
  QuestionCategories,
  QuestionTypes,
  QuestionCategoriesValues,
  MediaTypesValues,
  MediaTypes,
} from '@keyrigme/keyrigme-models';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema()
export class Question implements QuestionWithoutId {
  @Prop({ type: String, required: true }) public title: string;
  @Prop({ type: String, required: true }) public answer: string;
  @Prop({ type: Number, required: true, default: 3 }) public point: number;

  @Prop({
    type: String,
    enum: QuestionTypes['Media'],
    default: QuestionTypes.Media,
  })
  public type: (typeof QuestionTypes)['Media'];

  @Prop({
    type: [String],
    default: [
      QuestionCategories.OLD_TESTIMONY,
      QuestionCategories.NEW_TESTIMONY,
    ],
  })
  public categories: QuestionCategoriesValues[];

  @Prop({
    type: String,
    enum: Object.values(MediaTypes),
    default: MediaTypes.Image,
  })
  public mediaType: MediaTypesValues;

  @Prop({ type: String, default: '' })
  public file: string;

  @Prop({ type: Number, default: 10_000 })
  public timer: number;

  @Prop({ type: [String] }) public files: string[];
  @Prop({ default: () => new Date().toISOString() }) public createdAt: string;
  @Prop({ default: () => new Date().toISOString() }) public updatedAt: string;
}

const QuestionSchema = SchemaFactory.createForClass(Question);

export { QuestionSchema };
