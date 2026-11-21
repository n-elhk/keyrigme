import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

const OrderItemSchema = new MongooseSchema({
  label: { type: String, required: true },
  file: { type: String, required: true },
});

@Schema()
export class OrderQuestion {
  @Prop({ type: [OrderItemSchema], default: [] })
  public orderItems: { _id: string; label: string; file: string }[];

  @Prop({ type: [String], default: [] })
  public answer: string[];
}

export const OrderQuestionSchema = SchemaFactory.createForClass(OrderQuestion);
