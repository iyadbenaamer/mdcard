import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const customPricingSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    tierId: { type: ObjectId, ref: "CardTier", required: true },
    buyPrice: { type: Number, required: true },
  },
  { timestamps: true },
);

customPricingSchema.index({ userId: 1, tierId: 1 }, { unique: true });

const CustomPricing = model(
  "CustomPricing",
  customPricingSchema,
  "custom_pricing",
);

export default CustomPricing;
