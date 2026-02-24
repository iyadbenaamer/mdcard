import { Schema, model, Types } from "mongoose";

import { indexCardTypeDocument } from "../services/elasticsearch.js";

const { ObjectId } = Types;

const cardTypeSchema = new Schema(
  {
    categoryId: {
      type: ObjectId,
      ref: "CardCategory",
      required: true,
    },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// indexing the card type in elasticsearch
cardTypeSchema.post("save", async function (doc) {
  try {
    await indexCardTypeDocument(doc);
  } catch (error) {
    console.error("Error indexing document in Elasticsearch:", error);
  }
});

const CardType = model("CardType", cardTypeSchema, "card_types");
export default CardType;
