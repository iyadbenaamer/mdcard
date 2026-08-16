import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// One document per logged-in device. tokenHash is the only thing that lets a
// request resolve to this session - the raw opaque token handed to the
// client is never stored, mirroring how passwords/card codes are hashed
// rather than kept in plaintext.
const sessionSchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["android", "ios"], required: true },
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    appVersion: { type: String },
    attestation: {
      provider: {
        type: String,
        enum: ["play_integrity", "app_attest"],
        required: true,
      },
      verifiedAt: { type: Date, required: true },
    },
    ip: { type: String },
    lastUsedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    // Why this session was revoked - lets the resolving middleware tell an
    // evicted device apart from a plain logout/expiry so the app can show
    // "you were signed out because you logged in elsewhere" instead of a
    // generic session-expired message (see AUTH_SESSIONS_PLAN.md §9).
    revokedReason: {
      type: String,
      enum: ["logout", "logout_all", "evicted", "admin"],
      default: null,
    },
  },
  { timestamps: true },
);

// Cap enforcement (utils/session.js) queries "this user's active sessions,
// oldest lastUsedAt first" - support that directly.
sessionSchema.index({ user: 1, revokedAt: 1, lastUsedAt: 1 });

const Session = model("Session", sessionSchema);
export default Session;
