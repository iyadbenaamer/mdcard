import { verifyDeviceChallenge } from "../utils/deviceChallenge.js";
import { verifyPlayIntegrityToken } from "./playIntegrity.js";
import { verifyAppAttestToken } from "./appAttest.js";
import { createSession } from "../utils/session.js";
import { isSandboxMode } from "../utils/sandbox.js";

// Thrown with a machine-readable `code` matching this repo's { code }
// response convention - callers (auth.controller.js) map it straight onto
// the HTTP response instead of falling through to the generic 500 handler.
export class DeviceAuthError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

// Play Integrity (Android) is a fresh check every request: one opaque
// integrityToken in, one verdict out. App Attest (iOS) is not symmetric -
// generateKeyAsync + attestKeyAsync only happen once per device install (the
// key itself is persisted client-side and asserted against on every login
// after that with the cheaper generateAssertionAsync), so a login can arrive
// with either an `attestation` (first-ever login on this device) or an
// `assertion` (every login after). See AUTH_SESSIONS_PLAN.md and the
// @expo/app-integrity API this mirrors.
//
// `challenge` is the exact opaque string handed to the client by
// /device-challenge, and the exact string the client passes as
// requestHash/challenge into the native attestation calls - it's what
// Google/Apple echo back for the server to bind the verdict to this
// specific login attempt. That's distinct from the short random `nonce`
// claim *inside* the signed challenge JWT (see deviceChallenge.js), which
// exists only to keep each issued challenge unique - the attestation
// providers never see that claim, only the outer string, so that's what
// must be compared here.
const verifyAttestationForPlatform = async ({ platform, body, challenge, deviceId, userId, sandbox }) => {
  if (platform === "android") {
    if (!body.integrityToken) {
      throw new DeviceAuthError("AUTH_DEVICE_ATTESTATION_REQUIRED", 400);
    }
    await verifyPlayIntegrityToken({
      integrityToken: body.integrityToken,
      challenge,
      deviceId,
      sandbox,
    });
    return "play_integrity";
  }

  if (platform === "ios") {
    if (!body.keyId || (!body.attestation && !body.assertion)) {
      throw new DeviceAuthError("AUTH_DEVICE_ATTESTATION_REQUIRED", 400);
    }
    await verifyAppAttestToken({
      keyId: body.keyId,
      attestation: body.attestation,
      assertion: body.assertion,
      challenge,
      deviceId,
      userId,
      sandbox,
    });
    return "app_attest";
  }

  throw new DeviceAuthError("AUTH_DEVICE_PLATFORM_UNSUPPORTED", 400);
};

// Verifies the device that's logging in is a real, attested phone, then
// issues a session for it - the single choke point every login-equivalent
// flow (login, verifyAccount, resetPassword) goes through so a new access
// token is never handed out without a verified attestation.
export const issueSessionForRequest = async (user, req, { rememberMe = false } = {}) => {
  const { platform, deviceId, deviceName, appVersion, challenge } = req.body;

  if (!platform || !deviceId || !challenge) {
    throw new DeviceAuthError("AUTH_DEVICE_ATTESTATION_REQUIRED", 400);
  }

  try {
    // Confirms `challenge` is a genuinely server-issued, unexpired JWT.
    // Its return value (the inner nonce claim) isn't needed beyond this -
    // see the comment on verifyAttestationForPlatform for why the outer
    // `challenge` string, not that claim, is what gets compared against
    // Google/Apple's echoed value.
    verifyDeviceChallenge(challenge);
  } catch {
    throw new DeviceAuthError("AUTH_DEVICE_CHALLENGE_EXPIRED", 401);
  }

  const sandbox = isSandboxMode();
  let attestationProvider;
  try {
    attestationProvider = await verifyAttestationForPlatform({
      platform,
      body: req.body,
      challenge,
      deviceId,
      userId: user._id,
      sandbox,
    });
  } catch (err) {
    if (err instanceof DeviceAuthError) {
      throw err;
    }
    throw new DeviceAuthError("AUTH_DEVICE_ATTESTATION_FAILED", 403);
  }

  return createSession(user, {
    platform,
    deviceId,
    deviceName,
    appVersion,
    attestationProvider,
    ip: req.ip,
    rememberMe,
  });
};
