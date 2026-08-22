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
      enum: [
        "deposit",
        "gateway_deposit",
        "purchase",
        "refund",
        "exchange_sent",
        "exchange_received",
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, min: 0 },
    balanceAfter: { type: Number, min: 0 },
    orderId: { type: ObjectId, ref: "Order" },
    createdByAdmin: { type: ObjectId, ref: "Admin" },
    originalTransactionId: { type: ObjectId, ref: "Transaction" },
    // Dpay's session_id - only set for type: "gateway_deposit" (self-serve
    // wallet top-ups), which credit the wallet without admin involvement.
    paymentSessionId: { type: Number },
    // Balance-exchange fields - only set for "exchange_sent"/"exchange_received".
    // counterpartyName/Phone are snapshots (not populated) so a receiver's
    // record still shows who sent it even if the sender later renames
    // themselves. linkedTransactionId points the sender's and receiver's
    // docs at each other.
    counterpartyUserId: { type: ObjectId, ref: "User" },
    counterpartyName: { type: String },
    counterpartyPhone: { type: String },
    linkedTransactionId: { type: ObjectId, ref: "Transaction" },
    // fee/feePercentage are only set on "exchange_sent" - the sender pays
    // amount+fee, the receiver is credited the exact amount typed.
    fee: { type: Number, min: 0 },
    feePercentage: { type: Number, min: 0 },
    // Idempotency key for "exchange_sent" - see the partial unique index
    // below, same pattern as Order.checkoutKey.
    exchangeKey: { type: String, default: null },
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

  if (this.type === "gateway_deposit") {
    if (!this.paymentSessionId) {
      throw new Error("TRANSACTION_PAYMENT_SESSION_REQUIRED");
    }
    if (this.createdByAdmin || this.cardId || this.tierId || this.orderId) {
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

  if (this.type === "exchange_sent" || this.type === "exchange_received") {
    if (!this.counterpartyUserId || !this.counterpartyName || !this.counterpartyPhone) {
      throw new Error("TRANSACTION_COUNTERPARTY_REQUIRED");
    }
    if (!this.linkedTransactionId) {
      throw new Error("TRANSACTION_LINKED_REQUIRED");
    }
    if (this.createdByAdmin || this.orderId || this.paymentSessionId || this.originalTransactionId) {
      throw new Error("TRANSACTION_CARD_NOT_ALLOWED");
    }
  }

  if (this.type === "exchange_sent") {
    // fee=0 is a valid "no fee" value, so check presence explicitly rather
    // than falsy - only "never set" should fail validation.
    if (this.fee === undefined || this.fee === null) {
      throw new Error("TRANSACTION_FEE_REQUIRED");
    }
    if (this.feePercentage === undefined || this.feePercentage === null) {
      throw new Error("TRANSACTION_FEE_PERCENTAGE_REQUIRED");
    }
  }
});

// Wallet history (transaction.controller.js `get`) always filters by userId,
// optionally by type, and defaults to sorting by createdAt - this pair of
// indexes covers both the unfiltered and type-filtered cases without an
// in-memory sort.
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
// Same idempotency pattern as Order.checkoutKey - claiming this key before
// any balance mutation (see exchange.controller.js) makes a retried/
// duplicated exchange request safe instead of double-charging the sender.
transactionSchema.index(
  { userId: 1, exchangeKey: 1 },
  { unique: true, partialFilterExpression: { exchangeKey: { $type: "string" } } },
);

const Transaction = model("Transaction", transactionSchema, "transactions");
export default Transaction;
