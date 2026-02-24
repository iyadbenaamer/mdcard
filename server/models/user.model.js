import { Schema, model } from "mongoose";

import { indexUserDocument } from "../services/elasticsearch.js";

const userSchema = new Schema(
  {
    phone: { type: String, unique: true, max: 20, required: true },
    password: {
      type: String,
      required: true,
      min: 8,
      max: 50,
    },
    name: {
      type: String,
      required: true,
      min: 2,
      max: 20,
    },
    balance: { type: Number, default: 0, min: 0 },
    // if the user is verified, they can login and use the app, otherwise they need to verify their account first
    verificationStatus: {
      isVerified: { type: Boolean, default: false },
      token: String,
      remainingAttempts: { type: Number, default: 20, max: 20, min: 0 },
      resendAfter: Date,
      codesSentCount: { type: Number, default: 0 },
    },
    // if the user is blocked by admin, or deactivated their account, they won't be able to login
    isActive: { type: Boolean, default: true },
    // if the user is blocked by admin, they won't be able to buy cards, but they can still login and use the app
    canBuy: { type: Boolean, default: true },
    canSendCode: { type: Boolean, default: true },
    resetPassword: {
      token: String,
      remainingAttempts: { type: Number, default: 20, max: 20, min: 0 },
      resendAfter: Date,
      codesSentCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// indexing the user in elasticsearch
userSchema.post("save", async function (doc) {
  try {
    await indexUserDocument(doc);
  } catch (error) {
    console.error("Error indexing document in Elasticsearch:", error);
  }
});

const User = model("User", userSchema);
export default User;
