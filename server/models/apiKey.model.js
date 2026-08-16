import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Issued only to business-role users, only by an admin (mdcard-panel) - see
// AUTH_SESSIONS_PLAN.md. keyHash is the only stored form of the secret;
// keyPrefix is kept in the clear purely so the admin UI can show "which key
// is this" without ever re-displaying the full secret after creation.
const apiKeySchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    createdBy: { type: ObjectId, ref: "Admin" },
    // Who issued this key - an admin via mdcard-panel, or the business user
    // themselves via the mobile app's self-service flow. Defaults to "admin"
    // since every key predating self-service was admin-issued.
    createdByType: { type: String, enum: ["admin", "user"], default: "admin" },
    lastUsedAt: { type: Date },
    // Plaintext copy of the secret, set only for the one key auto-issued to
    // a business user by a sandbox signup (see auth.controller.js `signup`
    // and apiKey.controller.js `getApiKey`) so it can be handed back again
    // via GET /get-api-key without a device session. Every other key
    // (admin-issued or self-service via POST /user/api-keys) leaves this
    // null - same as before, the secret is shown once at creation and never
    // persisted anywhere.
    sandboxSecret: { type: String, default: null },
  },
  { timestamps: true },
);

apiKeySchema.index({ user: 1 });

const ApiKey = model("ApiKey", apiKeySchema);
export default ApiKey;
