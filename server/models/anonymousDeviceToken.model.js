import { Schema, model } from "mongoose";

// Mirrors mdcard-panel/server/models/anonymousDeviceToken.model.js - both
// servers point at the same MongoDB database. Holds Expo push tokens for
// devices that installed the app but haven't logged in yet (no User doc
// exists for them), so the panel can still target a "unauthorized users"
// notification audience at them. Once a device logs in, its token moves to
// User.pushTokens and the entry here is removed (see
// mdcard-mobile/hooks/use-push-notifications.js) so it isn't double-counted.
const anonymousDeviceTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["android", "ios"] },
    lastSeenAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

const AnonymousDeviceToken = model(
  "AnonymousDeviceToken",
  anonymousDeviceTokenSchema,
  "anonymous_device_tokens",
);
export default AnonymousDeviceToken;
