import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardTypeSchema = new Schema(
  {
    categoryId: {
      type: ObjectId,
      ref: "CardCategory",
      required: true,
    },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CardType = model("CardType", cardTypeSchema, "card_types");
export default CardType;
