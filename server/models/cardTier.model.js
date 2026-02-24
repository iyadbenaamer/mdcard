import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardTierSchema = new Schema(
  {
    typeId: { type: ObjectId, ref: "CardType", required: true },
    order: { type: Number, default: 0 },
    title: { type: String, default: "", required: true, trim: true },
    buyPrice: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CardTier = model("CardTier", cardTierSchema, "card_tiers");
export default CardTier;
