import Session from "../models/session.model.js";
import { handleError } from "../utils/errorHandler.js";

// "Manage devices" list for the current user - only active, unexpired
// sessions, newest-used first.
export const listSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select("platform deviceName appVersion createdAt lastUsedAt")
      .sort({ lastUsedAt: -1 });

    return res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session._id,
        platform: session.platform,
        deviceName: session.deviceName,
        appVersion: session.appVersion,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        isCurrent: session._id.equals(req.session._id),
      })),
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// Remote sign-out of a specific device. Scoped to the caller's own sessions
// so one user can never revoke another user's device by guessing an id.
export const revokeSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ code: "AUTH_SESSION_NOT_FOUND" });
    }
    session.revokedAt = new Date();
    session.revokedReason = "logout";
    await session.save();
    return res.status(200).json({ code: "AUTH_SESSION_REVOKED" });
  } catch (err) {
    return handleError(err, res);
  }
};
