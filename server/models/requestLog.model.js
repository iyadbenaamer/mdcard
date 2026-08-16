import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Audit trail for the handful of security/financial-sensitive request types
// (login, signup, verification codes, password changes, checkouts) - not a
// general access log. Rows are opt-in per request (see
// middleware/requestLog.middleware.js) rather than written for every request
// the server receives. Retention/deletion is handled by mdcard-panel's
// shared admin-configurable auto-delete job (server/utils/autoDelete.js
// there), the same one that purges Orders/Transactions - not a TTL index
// here, so a single admin setting governs all of them consistently.
const requestLogSchema = new Schema(
  {
    actionType: {
      type: String,
      enum: [
        "login",
        "signup",
        "verification_code",
        "password_change",
        "checkout",
      ],
      required: true,
    },
    status: { type: String, enum: ["success", "failure"], required: true },
    // Machine-readable code from the same { code } response the handler
    // sent the client (see utils/errorHandler.js), e.g. "AUTH_INVALID_LOGIN".
    resultCode: { type: String, default: null },
    // Only set for a failed "verification_code" attempt (wrong/expired
    // code) - how many attempts were left after this one, so repeated
    // failures/brute-forcing a code are visible in the audit trail.
    remainingAttempts: { type: Number, default: null },
    // No standalone index here - the { userId, createdAt } compound index
    // below already serves any query that filters on userId alone.
    userId: { type: ObjectId, ref: "User", default: null },
    authMethod: { type: String, enum: ["session", "api_key"], default: null },
    method: { type: String, required: true },
    path: { type: String, required: true },
    ip: { type: String, default: null },
    location: {
      country: { type: String, default: null },
      region: { type: String, default: null },
      city: { type: String, default: null },
    },
    timeZone: { type: String, default: null },
    device: {
      platform: { type: String, default: null },
      deviceId: { type: String, default: null },
      deviceName: { type: String, default: null },
    },
  },
  { timestamps: true },
);

requestLogSchema.index({ userId: 1, createdAt: -1 });
requestLogSchema.index({ actionType: 1, createdAt: -1 });

const RequestLog = model("RequestLog", requestLogSchema, "requestlogs");
export default RequestLog;
