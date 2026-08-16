import geoip from "geoip-lite";

import RequestLog from "../models/requestLog.model.js";

// Real MAC addresses are never sent over HTTP (browsers/OSes never expose
// them to a server), so "device" is identified the same way Session already
// does it: the deviceId/platform/deviceName the mobile app puts in the
// request body for device-auth flows (see services/deviceAuth.js). This is
// null for web/API-key traffic, which never sends those fields.
const pickDevice = (body = {}) => ({
  platform: body.platform || null,
  deviceId: body.deviceId || null,
  deviceName: body.deviceName || null,
});

export const recordRequestLog = async (
  req,
  { actionType, status, resultCode, userId, remainingAttempts },
) => {
  const ip = req.ip || null;
  // geoip-lite resolves nothing for private/loopback ranges (localhost,
  // internal networks), so location/timeZone stay null in dev.
  const geo = ip ? geoip.lookup(ip) : null;

  await RequestLog.create({
    actionType,
    status,
    resultCode: resultCode || null,
    remainingAttempts: remainingAttempts ?? null,
    userId: userId || req.user?.id || null,
    authMethod: req.authMethod || null,
    method: req.method,
    path: req.originalUrl,
    ip,
    location: geo
      ? {
          country: geo.country || null,
          region: geo.region || null,
          city: geo.city || null,
        }
      : undefined,
    timeZone: geo?.timezone || null,
    device: pickDevice(req.body),
  });
};
