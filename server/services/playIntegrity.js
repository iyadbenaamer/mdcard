import { GoogleAuth } from "google-auth-library";
import axios from "axios";

const PLAY_INTEGRITY_SCOPE = "https://www.googleapis.com/auth/playintegrity";

// The device-recognition bar we require - MEETS_DEVICE_INTEGRITY is the
// standard "genuine, unmodified Android device" verdict. See
// https://developer.android.com/google/play/integrity/verdicts
const ACCEPTED_DEVICE_VERDICTS = ["MEETS_DEVICE_INTEGRITY"];

// GoogleAuth.getClient() does its own token caching/refresh internally, so
// caching the client (not just a token) across requests is the correct and
// recommended usage - re-authenticating from the service account key on
// every login would be wasteful and slower than necessary.
let cachedAuthClientPromise = null;

const getAuthClient = () => {
  if (!cachedAuthClientPromise) {
    const credentialsJson = process.env.GOOGLE_PLAY_INTEGRITY_CREDENTIALS;
    const auth = new GoogleAuth({
      credentials: JSON.parse(credentialsJson),
      scopes: [PLAY_INTEGRITY_SCOPE],
    });
    cachedAuthClientPromise = auth.getClient();
  }
  return cachedAuthClientPromise;
};

// Verifies an Android Play Integrity token (from @expo/app-integrity's
// requestIntegrityCheckAsync) against the challenge the mobile app was
// issued. `challenge` here is the exact string the mobile app passed as
// requestHash to the native module - Google just echoes it back unmodified
// in the verdict, so comparing it against what deviceAuth.js handed to the
// client is what binds this specific verdict to this specific login
// attempt (see server/utils/deviceChallenge.js for how that challenge
// string itself is already signed + time-limited).
export const verifyPlayIntegrityToken = async ({ integrityToken, challenge, sandbox }) => {
  if (sandbox) {
    // Mirrors utils/sandbox.js: fakes a passing verdict so the full
    // login/session flow can be exercised without real Google credentials,
    // the same way checkout fakes Bamboo card sourcing in sandbox mode.
    return { verified: true };
  }

  if (process.env.SKIP_DEVICE_PLATFORM_VERIFICATION === "true") {
    return { verified: true };
  }

  const packageName = process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME;
  if (!packageName || !process.env.GOOGLE_PLAY_INTEGRITY_CREDENTIALS) {
    throw new Error("PLAY_INTEGRITY_NOT_CONFIGURED");
  }

  const authClient = await getAuthClient();
  const { token: accessToken } = await authClient.getAccessToken();

  const { data } = await axios.post(
    `https://playintegrity.googleapis.com/v1/${packageName}:decodeIntegrityToken`,
    { integrity_token: integrityToken },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const payload = data?.tokenPayloadExternal;
  const requestDetails = payload?.requestDetails;
  const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict || [];
  const appVerdict = payload?.appIntegrity?.appRecognitionVerdict;

  // Without this, a captured/leaked integrity token could be replayed
  // against a completely different login attempt.
  if (requestDetails?.requestHash !== challenge) {
    throw new Error("PLAY_INTEGRITY_REQUEST_MISMATCH");
  }
  if (requestDetails?.requestPackageName !== packageName) {
    throw new Error("PLAY_INTEGRITY_PACKAGE_MISMATCH");
  }
  if (appVerdict !== "PLAY_RECOGNIZED") {
    // appRecognitionVerdict is Google's own record of whether this binary
    // was distributed through Play - UNRECOGNIZED_VERSION almost always
    // means the APK on the device wasn't installed via Play (a sideloaded/
    // directly-distributed build, or one signed with a different key than
    // what's registered in Play App Signing), not a server-side
    // misconfiguration. Logging the full payload here since the verdict
    // value itself (vs. UNEVALUATED, etc.) tells them apart.
    console.error("[playIntegrity] app not recognized, full payload:", JSON.stringify(payload));
    throw new Error("PLAY_INTEGRITY_APP_NOT_RECOGNIZED");
  }
  if (!deviceVerdicts.some((verdict) => ACCEPTED_DEVICE_VERDICTS.includes(verdict))) {
    console.error("[playIntegrity] device not trusted, full payload:", JSON.stringify(payload));
    throw new Error("PLAY_INTEGRITY_DEVICE_NOT_TRUSTED");
  }

  return { verified: true };
};
