/*
 * Shared policy for OTP (verification / password-reset code) sending and
 * guessing, used by every flow in auth.controller.js that issues or checks
 * a phone code. Centralized here so the numbers are tuned in one place and
 * every flow (signup, login, verify-account, reset-password) stays in sync.
 *
 * Two independent limits bound abuse:
 *  - MAX_CODE_ATTEMPTS: wrong-guess attempts allowed against a single issued
 *    code before the user must request a new one.
 *  - MAX_DAILY_RESENDS: how many codes can be issued within a rolling
 *    RESEND_WINDOW_MS window. Older behavior let codesSentCount grow forever
 *    once it passed the last backoff tier, which meant a determined caller
 *    could keep requesting fresh codes (each with a full attempt budget)
 *    indefinitely. Capping the window and locking out until it resets keeps
 *    the total number of guesses against an account bounded over time.
 */

export const MAX_CODE_ATTEMPTS = Number(process.env.MAX_CODE_ATTEMPTS) || 5;
export const MAX_DAILY_RESENDS = Number(process.env.MAX_DAILY_RESENDS) || 6;
export const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;

// Backoff grows with each resend within the window; the last tier covers
// every resend up to MAX_DAILY_RESENDS.
const RESEND_TIERS_MS = [
  60 * 1000, // 1st resend
  60 * 1000, // 2nd resend
  5 * 60 * 1000, // 3rd resend
  5 * 60 * 1000, // 4th resend
  30 * 60 * 1000, // 5th resend
  30 * 60 * 1000, // 6th resend (and any tier beyond, up to the daily cap)
];

const getBackoffForCount = (count) => {
  const tier = RESEND_TIERS_MS[Math.min(count, RESEND_TIERS_MS.length) - 1];
  return tier ?? RESEND_TIERS_MS[RESEND_TIERS_MS.length - 1];
};

const isWindowExpired = (status) => {
  if (!status?.windowStart) {
    return true;
  }
  const windowStartTime = new Date(status.windowStart).getTime();
  return (
    Number.isNaN(windowStartTime) ||
    Date.now() - windowStartTime >= RESEND_WINDOW_MS
  );
};

/**
 * Decides whether a new code may be sent right now. Call before generating
 * and sending a code; pass the result into registerCodeSent afterwards.
 */
export const evaluateResend = (status) => {
  const windowExpired = isWindowExpired(status);
  const sentInWindow = windowExpired ? 0 : status?.codesSentCount || 0;

  if (sentInWindow >= MAX_DAILY_RESENDS) {
    const windowStartTime = new Date(status.windowStart).getTime();
    return {
      allowed: false,
      reason: "DAILY_LIMIT",
      resendAfter: new Date(windowStartTime + RESEND_WINDOW_MS),
      windowExpired,
    };
  }

  if (!windowExpired && status?.resendAfter) {
    const resendAfterTime = new Date(status.resendAfter).getTime();
    if (!Number.isNaN(resendAfterTime) && resendAfterTime > Date.now()) {
      return {
        allowed: false,
        reason: "COOLDOWN",
        resendAfter: status.resendAfter,
        windowExpired,
      };
    }
  }

  return { allowed: true, windowExpired };
};

/**
 * Mutates the verification/reset status subdocument after a code has just
 * been sent: resets the attempt budget, advances the resend counter, and
 * schedules the next allowed resend time (or locks until the window resets
 * if the daily cap has just been reached).
 */
export const registerCodeSent = (status, { windowExpired } = {}) => {
  const now = new Date();
  if (windowExpired) {
    status.windowStart = now;
    status.codesSentCount = 0;
  }
  status.codesSentCount = (status.codesSentCount || 0) + 1;
  status.remainingAttempts = MAX_CODE_ATTEMPTS;

  status.resendAfter =
    status.codesSentCount >= MAX_DAILY_RESENDS
      ? new Date(new Date(status.windowStart).getTime() + RESEND_WINDOW_MS)
      : new Date(now.getTime() + getBackoffForCount(status.codesSentCount));

  return status;
};

/** Clears all OTP-policy state, e.g. once a code has been verified. */
export const resetCodeState = (status) => {
  status.remainingAttempts = MAX_CODE_ATTEMPTS;
  status.resendAfter = null;
  status.codesSentCount = 0;
  status.windowStart = null;
};
