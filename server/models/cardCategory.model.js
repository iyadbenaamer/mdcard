import { Schema, model } from "mongoose";

const cardCategorySchema = new Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, default: "", trim: true },
    },
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
