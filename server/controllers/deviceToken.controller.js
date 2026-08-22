import AnonymousDeviceToken from "../models/anonymousDeviceToken.model.js";

import { handleError } from "../utils/errorHandler.js";

const PLATFORMS = ["android", "ios"];

export const registerAnonymousToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ code: "DEVICE_TOKEN_REQUIRED" });
    }

    await AnonymousDeviceToken.findOneAndUpdate(
      { token },
      { platform: PLATFORMS.includes(platform) ? platform : undefined, lastSeenAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ code: "DEVICE_TOKEN_REGISTERED" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const removeAnonymousToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ code: "DEVICE_TOKEN_REQUIRED" });
    }

    await AnonymousDeviceToken.deleteOne({ token });
    return res.status(200).json({ code: "DEVICE_TOKEN_REMOVED" });
  } catch (err) {
    return handleError(err, res);
  }
};
