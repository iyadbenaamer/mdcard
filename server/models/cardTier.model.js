import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardTierSchema = new Schema(
  {
    typeId: { type: ObjectId, ref: "CardType", required: true },
    order: { type: Number, default: 0 },
    title: { type: String, default: "", required: true, trim: true },
    buyPrice: { type: Number, default: null },
    buyPriceUsd: { type: Number, default: null },
    sellPrice: { type: Number, required: true },
    bambooProductId: { type: String, trim: true, default: "" },
    value: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Backs the tier-listing query for a card type's product page
// (find({ typeId, isActive: true }).sort({ order: 1, createdAt: -1 })) and
// the equality lookup on typeId done inside cardType.controller.js's
// tier-detail aggregation - both hit on essentially every product view.
cardTierSchema.index({ typeId: 1, isActive: 1, order: 1, createdAt: -1 });

const CardTier = model("CardTier", cardTierSchema, "card_tiers");
export default CardTier;
