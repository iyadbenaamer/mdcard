import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardSchema = new Schema(
  {
    tierId: { type: ObjectId, ref: "CardTier", required: true },
    serialNumber: { type: String, required: true, unique: true },
    code: { type: String, required: true }, // encrypted in production
    codeHash: { type: String, index: true },
    status: {
      type: String,
      enum: ["available", "sold"],
      default: "available",
    },
    soldTo: { type: ObjectId, ref: "User", default: null },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const Card = model("Card", cardSchema, "cards");
export default Card;
