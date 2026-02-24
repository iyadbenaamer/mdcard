import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const transactionSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, min: 0 },
    balanceAfter: { type: Number, min: 0 },
    cardId: { type: ObjectId, ref: "Card" },
    tierId: { type: ObjectId, ref: "CardTier" },
    orderId: { type: ObjectId, ref: "Order" },
    createdByAdmin: { type: ObjectId, ref: "Admin" },
    originalTransactionId: { type: ObjectId, ref: "Transaction" },
  },
  { timestamps: true },
);

transactionSchema.pre("validate", function () {
  if (this.type === "deposit") {
    if (!this.createdByAdmin) {
      throw new Error("TRANSACTION_ADMIN_REQUIRED");
    }
    if (this.cardId || this.tierId || this.orderId) {
      throw new Error("TRANSACTION_CARD_NOT_ALLOWED");
    }
  }

  if (this.type === "purchase") {
    if (!this.orderId && !this.cardId) {
      throw new Error("TRANSACTION_ORDER_OR_CARD_REQUIRED");
    }
    if (this.createdByAdmin) {
      throw new Error("TRANSACTION_ADMIN_NOT_ALLOWED");
    }
  }

  if (this.type === "refund") {
    if (!this.createdByAdmin) {
      throw new Error("TRANSACTION_ADMIN_REQUIRED");
    }
    if (!this.originalTransactionId) {
      throw new Error("TRANSACTION_ORIGINAL_REQUIRED");
    }
  }
});

transactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction = model("Transaction", transactionSchema, "transactions");
export default Transaction;
