import { Schema, model, Types } from "mongoose";
import { isSandboxMode } from "../utils/sandbox.js";

const { ObjectId } = Types;
const isSandbox = isSandboxMode();

const transactionSchema = new Schema(
  {
    // No standalone index here - the compound indexes below (both prefixed
    // by userId) already serve any query that filters on userId alone.
    userId: { type: ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, min: 0 },
    balanceAfter: { type: Number, min: 0 },
    orderId: { type: ObjectId, ref: "Order" },
    createdByAdmin: { type: ObjectId, ref: "Admin" },
    originalTransactionId: { type: ObjectId, ref: "Transaction" },
  },
  { timestamps: true },
);

transactionSchema.pre("validate", function () {
  if (this.type === "deposit") {
    if (!this.createdByAdmin && !isSandbox) {
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

// Wallet history (transaction.controller.js `get`) always filters by userId,
// optionally by type, and defaults to sorting by createdAt - this pair of
// indexes covers both the unfiltered and type-filtered cases without an
// in-memory sort.
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Transaction = model("Transaction", transactionSchema, "transactions");
export default Transaction;
