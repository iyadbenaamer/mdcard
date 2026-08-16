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
    soldTo: { type: ObjectId, ref: "User", default: null },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Every checkout reserves stock with findOneAndUpdate({ tierId, soldTo: null },
// ..., { sort: { createdAt: 1 } }), and availability checks/product pages run
// countDocuments({ tierId, soldTo: null }) on the same shape - without this
// index those all fall back to a full collection scan of every card ever
// issued. Field order and the createdAt direction match that sort so the
// reservation query is answered from the index alone (no in-memory sort).
cardSchema.index({ tierId: 1, soldTo: 1, createdAt: 1 });

const Card = model("Card", cardSchema, "cards");
export default Card;
