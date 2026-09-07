import { Schema, model } from "mongoose";

const paymentMethodSchema = new Schema(
  {
    // Internal identifier for the method (e.g. "edfali", "moamalat"). Shown to
    // admins only - pay.net.ly picks the real gateway on its own hosted page,
    // so this is no longer sent anywhere.
    name: { type: String, required: true, trim: true, unique: true },
    label: { type: String, required: true, trim: true },
    iconPath: { type: String, required: true },
    active: { type: Boolean, default: true },
    // When true (default), the app shows an amount field and enforces
    // min/maxDeposit. When false the app hides the field and the top-up always
    // uses fixedAmount - for methods where the user shouldn't pick the amount.
    amountEnabled: { type: Boolean, default: true },
    minDeposit: { type: Number, min: 0 },
    maxDeposit: { type: Number, min: 0 },
    // Required only when amountEnabled is false.
    fixedAmount: { type: Number, min: 0 },
  },
  { timestamps: true },
);

paymentMethodSchema.pre("validate", function () {
  if (this.amountEnabled === false) {
    if (this.fixedAmount === undefined || this.fixedAmount === null) {
      throw new Error("PAYMENT_METHOD_FIXED_AMOUNT_REQUIRED");
    }
  } else if (
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
