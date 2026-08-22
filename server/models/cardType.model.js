import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const cardTypeSchema = new Schema(
  {
    categoryId: {
      type: ObjectId,
      ref: "CardCategory",
      required: true,
    },
    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, default: "", trim: true },
    },
    fulfillmentSource: {
      type: String,
      enum: ["local", "bamboo"],
      default: "local",
    },
    // Template string printed on each card (supports placeholders: {code}, {serial}, {title}, {tier})
    redeemFormat: String,
    // Optional image URL or storage path to print on the card (can be an asset module, URL or data URI)
    printImage: { type: String },
    // Controls whether printable expiry dates include the day component
    showExpiryDateDay: { type: Boolean, default: true },
    // Notes or description for this card type
    notes: { type: String },
    order: { type: Number, default: 0 },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// cardCategory.controller.js's getAll (category list, shown on every home
// screen load) and cardType.controller.js's getByCategory both $lookup this
// collection by categoryId, then filter/sort on isActive/order.
cardTypeSchema.index({ categoryId: 1, isActive: 1, order: 1 });
// cardType.controller.js's getPaginated (browse-all) and
// search.controller.js's searchCardTypes both filter on isActive alone and
// sort by createdAt.
cardTypeSchema.index({ isActive: 1, createdAt: -1 });

const CardType = model("CardType", cardTypeSchema, "card_types");
export default CardType;
