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
    // No standalone index here - the { userId, createdAt } index below
    // already serves any query that filters on userId alone.
    userId: { type: ObjectId, ref: "User", required: true },
    // Client-generated idempotency key for the checkout request. Ensures a
    // retried/duplicated checkout submission (e.g. a double-tap or a
    // network retry racing the original request) can never create two
    // orders for the same checkout attempt.
    checkoutKey: { type: String, default: null },
    totalAmount: { type: Number, required: true, min: 0 },
    items: [orderItemSchema],
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index(
  { userId: 1, checkoutKey: 1 },
  { unique: true, partialFilterExpression: { checkoutKey: { $type: "string" } } },
);

const Order = model("Order", orderSchema, "orders");
export default Order;
