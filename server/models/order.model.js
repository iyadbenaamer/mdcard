import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const orderItemSchema = new Schema(
  {
    tierId: { type: ObjectId, ref: "CardTier", required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    provider: { type: String, enum: ["local", "bamboo"], default: "local" },
    externalOrderId: { type: String, default: null },
    cards: [{ type: ObjectId, ref: "Card" }],
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    items: [orderItemSchema],
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });

const Order = model("Order", orderSchema, "orders");
export default Order;
