import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardTypeSchema = new Schema(
  {
    categoryId: {
      type: ObjectId,
      ref: "CardCategory",
      required: true,
    },
    name: { type: String, required: true },
    fulfillmentSource: {
      type: String,
      enum: ["local", "bamboo"],
      default: "local",
    },
    // Template string printed on each card (supports placeholders: {code}, {serial}, {title}, {tier})
    redeemFormat: String,
    // Optional image URL or storage path to print on the card (can be an asset module, URL or data URI)
    printImage: { type: String },
    order: { type: Number, default: 0 },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CardType = model("CardType", cardTypeSchema, "card_types");
export default CardType;
