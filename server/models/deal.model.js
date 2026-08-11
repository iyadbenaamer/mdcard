import { Schema, model } from "mongoose";

const dealSchema = new Schema(
  {
    badge: { type: String, required: true, trim: true },
    background: { type: String, required: true },
    link: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Deal = model("Deal", dealSchema, "deals");

export default Deal;
