import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Tracks one pay.net.ly hosted-payment top-up attempt end to end. Both the
// async backend_url webhook and the client-driven status poll resolve through
// the same record, and the "pending" -> non-pending transition (see
// wallet.controller.js) is the idempotency guard that stops a wallet from
// being credited twice for the same payment.
const paynetPaymentSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    paymentMethodId: { type: ObjectId, ref: "PaymentMethod", required: true },
    // Snapshot of the picked method's display label. The in-app method list is
    // branding only now - pay.net.ly picks the real gateway on its own page.
    payMethodLabel: { type: String },
    // The custom_ref we send to pay.net.ly and look transactions up by. The
    // webhook echoes it back, so an unguessable value also acts as the shared
    // secret for the otherwise-unsigned callback.
    customRef: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending",
      required: true,
    },
    paymentUrl: { type: String },
    // Filled in from the receipt lookup once the payment completes.
    gatewayName: { type: String },
    gatewayRef: { type: String },
    receiptReference: { type: String },
    webhookReceivedAt: { type: Date },
  },
  { timestamps: true },
);

paynetPaymentSchema.index({ userId: 1, createdAt: -1 });

const PaynetPayment = model(
  "PaynetPayment",
  paynetPaymentSchema,
  "paynet_payments",
);
export default PaynetPayment;
