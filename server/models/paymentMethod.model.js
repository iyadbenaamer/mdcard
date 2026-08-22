import { Schema, model } from "mongoose";

const paymentMethodFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["text", "phone", "number"],
      default: "text",
    },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const paymentMethodSchema = new Schema(
  {
    // Dpay's pay_method slug (e.g. "edfali", "moamalat") - sent as-is to Dpay.
    name: { type: String, required: true, trim: true, unique: true },
    label: { type: String, required: true, trim: true },
    iconPath: { type: String, required: true },
    active: { type: Boolean, default: true },
    minDeposit: { type: Number, required: true, min: 0 },
    maxDeposit: { type: Number, required: true, min: 0 },
    // Dynamic form fields this gateway needs at session-open time (e.g.
    // customer_mobile for EDFali, card_number for bank gateways) - lets the
    // mobile app render the right inputs per gateway without a hardcoded map.
    fields: { type: [paymentMethodFieldSchema], default: [] },
  },
  { timestamps: true },
);

paymentMethodSchema.pre("validate", function () {
  if (
    this.minDeposit !== undefined &&
    this.maxDeposit !== undefined &&
    this.maxDeposit <= this.minDeposit
  ) {
    throw new Error("PAYMENT_METHOD_MAX_MUST_EXCEED_MIN");
  }
});

const PaymentMethod = model(
  "PaymentMethod",
  paymentMethodSchema,
  "payment_methods",
);

export default PaymentMethod;
