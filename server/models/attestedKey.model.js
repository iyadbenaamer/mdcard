import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// One document per iOS device install's App Attest key. Unlike Play
// Integrity (a fresh check every login), App Attest is attest-once /
// assert-thereafter: the public key established here on the first-ever
// login on a device is what every subsequent assertion is verified against,
// so it has to outlive any single Session document. See §6/§9 of
// AUTH_SESSIONS_PLAN.md.
const attestedKeySchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    keyId: { type: String, required: true, unique: true }, // base64, from generateKeyAsync()
    publicKeyPem: { type: String, required: true },
    deviceId: { type: String, required: true },
    environment: {
      type: String,
      enum: ["development", "production"],
      required: true,
    },
    // Apple's authenticator sign counter, tracked to catch a captured
    // assertion being replayed with an older count (see appAttestVerify.js).
    signCount: { type: Number, required: true, default: 0 },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

attestedKeySchema.index({ user: 1, revokedAt: 1 });

const AttestedKey = model("AttestedKey", attestedKeySchema);
export default AttestedKey;
