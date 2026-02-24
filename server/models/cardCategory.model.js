import { Schema, model } from "mongoose";

const cardCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

const CardCategory = model(
  "CardCategory",
  cardCategorySchema,
  "card_categories",
);
export default CardCategory;
