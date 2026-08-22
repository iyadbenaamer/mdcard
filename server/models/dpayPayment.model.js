import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Tracks one Dpay top-up attempt end to end. Both the synchronous OTP-verify
// response and the async webhook update this record, and the "pending" ->
// non-pending transition (see wallet.controller.js) is the idempotency guard
// that stops a wallet from being credited twice for the same session.
const dpayPaymentSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    paymentMethodId: { type: ObjectId, ref: "PaymentMethod", required: true },
    payMethod: { type: String, required: true },
    sessionId: { type: Number, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number },
    total: { type: Number },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired", "refunded", "voided"],
      default: "pending",
      required: true,
    },
    txId: { type: String },
    receiptUrl: { type: String },
    idempotencyKey: { type: String },
    webhookReceivedAt: { type: Date },
  },
  { timestamps: true },
);

dpayPaymentSchema.index({ userId: 1, createdAt: -1 });

const DpayPayment = model("DpayPayment", dpayPaymentSchema, "dpay_payments");
export default DpayPayment;
