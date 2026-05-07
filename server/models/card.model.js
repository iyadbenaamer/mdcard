import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardSchema = new Schema(
  {
    tierId: { type: ObjectId, ref: "CardTier", required: true },
    serialNumber: { type: String, required: true, unique: true },
    code: { type: String, required: true }, // encrypted in production
    codeHash: { type: String, index: true },
    pin: { type: String, default: null },
    expiryDate: { type: Date, default: null },
    provider: {
      type: String,
      enum: ["local", "bamboo"],
      default: "local",
    },
    externalSerialNumber: { type: String, default: null },
    externalOrderId: { type: String, default: null, index: true },
    externalStatus: { type: String, default: null },
    externalPayload: { type: Schema.Types.Mixed, default: null },
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
