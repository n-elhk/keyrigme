import { MediaTypes } from '@keyrigme/keyrigme-models';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class MediaQuestion {
  @Prop({ type: [String], default: [] })
  public files: string[];

  @Prop({
    type: String,
    enum: Object.values(MediaTypes),
    default: MediaTypes.Image,
  })
  public mediaType: string;

  @Prop({ type: String, required: true })
  public answer: string;
}

export const MediaQuestionSchema = SchemaFactory.createForClass(MediaQuestion);
