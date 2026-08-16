import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import AttestedKey from "../models/attestedKey.model.js";
import {
  verifyAttestation,
  verifyAssertion,
  AppAttestVerificationError,
} from "../utils/appAttestVerify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_CA_PEM = fs.readFileSync(
  path.join(__dirname, "../config/apple_app_attest_root_ca.pem"),
  "utf8",
);

// "development" until the app.json App Attest entitlement (see
// AUTH_SESSIONS_PLAN.md §7) is switched to "production" for an App Store
// release build - Apple attests development and production builds against
// different aaguid values, so this must track that entitlement.
const getEnvironment = () =>
  process.env.APPLE_APP_ATTEST_ENVIRONMENT === "production"
    ? "production"
    : "development";

// Verifies an iOS App Attest key/assertion (from @expo/app-integrity)
// against `challenge` - the exact opaque string /device-challenge handed to
// the client and that the client passed into attestKeyAsync/
// generateAssertionAsync, which Apple embeds into what it returns for the
// server to check against (not the short `nonce` claim inside that
// challenge's JWT - see deviceAuth.js). Unlike Android, this is a two-phase
// flow the client drives:
//   - First-ever login on a device: client calls generateKeyAsync +
//     attestKeyAsync, so this receives { keyId, attestation }.
//   - Every login after that: client reuses the same keyId and calls
//     generateAssertionAsync instead (cheaper, no fresh attestation), so
//     this receives { keyId, assertion }.
//
// Real verification requires an Apple Developer Program enrollment, an App
// ID with the App Attest capability, and the Team ID / Bundle ID used to
// call Apple's verification servers (see AUTH_SESSIONS_PLAN.md
// prerequisites) - until APPLE_APP_ATTEST_TEAM_ID/APPLE_APP_ATTEST_BUNDLE_ID
// are configured this fails closed rather than accepting an unverified
// device. The cryptographic verification itself (CBOR parsing, certificate
// chain to Apple's root, nonce/rpId/signCount checks) lives in
// utils/appAttestVerify.js; this module is the orchestration + persistence
// layer around it, mirroring playIntegrity.js's shape.
export const verifyAppAttestToken = async ({
  keyId,
  attestation,
  assertion,
  challenge,
  deviceId,
  userId,
  sandbox,
}) => {
  if (sandbox) {
    // Mirrors utils/sandbox.js: fakes a passing verdict so the full
    // login/session flow can be exercised without real Apple credentials,
    // the same way checkout fakes Bamboo card sourcing in sandbox mode.
    return { verified: true };
  }

  const teamId = process.env.APPLE_APP_ATTEST_TEAM_ID;
  const bundleId = process.env.APPLE_APP_ATTEST_BUNDLE_ID;
  if (!teamId || !bundleId) {
    throw new Error("APP_ATTEST_NOT_CONFIGURED");
  }

  const environment = getEnvironment();

  try {
    if (attestation) {
      // First-ever login on this device install: verify the fresh
      // attestation against Apple's PKI and persist the public key it
      // establishes - every later login on this device only sends a
      // (cheaper) assertion verified against that stored key, not a fresh
      // attestation.
      const existing = await AttestedKey.findOne({ keyId, revokedAt: null });
      if (existing && String(existing.user) !== String(userId)) {
        throw new AppAttestVerificationError("APP_ATTEST_KEY_ALREADY_REGISTERED");
      }

      const { publicKeyPem, signCount } = await verifyAttestation({
        attestationB64: attestation,
        keyIdB64: keyId,
        challenge,
        teamId,
        bundleId,
        rootCaPem: ROOT_CA_PEM,
        environment,
      });

      await AttestedKey.findOneAndUpdate(
        { keyId },
        {
          user: userId,
          keyId,
          publicKeyPem,
          deviceId,
          environment,
          signCount,
          lastUsedAt: new Date(),
          revokedAt: null,
        },
        { upsert: true, setDefaultsOnInsert: true },
      );

      return { verified: true };
    }

    // Every login after the device's first: look up the key established at
    // attestation time and verify the assertion's signature against it.
    const attestedKey = await AttestedKey.findOne({ keyId, revokedAt: null });
    if (!attestedKey || String(attestedKey.user) !== String(userId)) {
      throw new AppAttestVerificationError("APP_ATTEST_UNKNOWN_KEY");
    }

    const { signCount } = verifyAssertion({
      assertionB64: assertion,
      publicKeyPem: attestedKey.publicKeyPem,
      challenge,
      teamId,
      bundleId,
      storedSignCount: attestedKey.signCount,
    });

    attestedKey.signCount = signCount;
    attestedKey.lastUsedAt = new Date();
    await attestedKey.save();

    return { verified: true };
  } catch (err) {
    if (err instanceof AppAttestVerificationError) {
      throw err;
    }
    throw new AppAttestVerificationError(`APP_ATTEST_VERIFICATION_FAILED: ${err?.message || err}`);
  }
};
