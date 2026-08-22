import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Admin-controlled percentage discount on a single card tier. Discounts
// only ever apply to individual-role users - business pricing is driven
// entirely by buyPrice/buyPriceUsd/CustomPricing and never reads this
// collection (see utils/priceCalculator.js).
const discountSchema = new Schema(
  {
    tierId: { type: ObjectId, ref: "CardTier", required: true, unique: true },
    percentage: { type: Number, required: true, min: 1, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Discount = model("Discount", discountSchema, "discounts");
export default Discount;
