import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const customePricingSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    tierId: { type: ObjectId, ref: "CardTier", required: true },
    buyPrice: { type: Number, required: true },
  },
  { timestamps: true },
);

customePricingSchema.index({ userId: 1, tierId: 1 }, { unique: true });

const CustomePricing = model(
  "CustomePricing",
  customePricingSchema,
  "custome_pricing",
);

export default CustomePricing;
