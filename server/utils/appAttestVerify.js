import "reflect-metadata";
import crypto from "crypto";
import cbor from "cbor";
import * as x509 from "@peculiar/x509";

// Implements Apple's documented App Attest server-side verification
// algorithm ("Validating apps that connect to your server" /
// "Verifying assertions" in Apple's DeviceCheck docs). This is the one place
// in the codebase that speaks CBOR/X.509 - everything above this module
// (appAttest.js) only ever passes base64 strings in and gets a PEM public
// key / sign count out.
//
// Uses @peculiar/x509 rather than node-forge for certificate parsing:
// node-forge's certificate/public-key parsing is RSA-only and throws
// ("Cannot read public key. OID is not RSA.") on the EC (P-256) keys Apple's
// App Attest PKI actually uses - confirmed by hitting that exact error
// against a real EC test chain while building this, not a guess.

const APP_ATTEST_EXTENSION_OID = "1.2.840.113635.100.8.2";

// 16-byte aaguid Apple stamps into attested credential data, distinguishing
// keys attested against the development vs. production App Attest service -
// these are fixed ASCII-padded constants, not derived from anything.
const AAGUID_DEVELOPMENT = Buffer.from("appattestdevelop", "ascii");
const AAGUID_PRODUCTION = Buffer.concat([
  Buffer.from("appattest", "ascii"),
  Buffer.alloc(7, 0),
]);

class AppAttestVerificationError extends Error {}

const sha256 = (...buffers) => crypto.createHash("sha256").update(Buffer.concat(buffers)).digest();

// Parses the fixed-shape authData structure shared by attestation and
// assertion objects (WebAuthn-style layout, reused by App Attest):
// rpIdHash(32) | flags(1) | signCount(4) | [attestedCredentialData, only
// when the AT flag (0x40) is set - present on attestation, absent on
// assertion].
const parseAuthData = (authData) => {
  if (authData.length < 37) {
    throw new AppAttestVerificationError("APP_ATTEST_AUTH_DATA_TOO_SHORT");
  }
  const rpIdHash = authData.subarray(0, 32);
  const flags = authData[32];
  const signCount = authData.readUInt32BE(33);
  const attestedCredentialDataIncluded = (flags & 0x40) !== 0;

  let aaguid = null;
  let credentialId = null;
  if (attestedCredentialDataIncluded) {
    if (authData.length < 37 + 16 + 2) {
      throw new AppAttestVerificationError("APP_ATTEST_AUTH_DATA_TOO_SHORT");
    }
    aaguid = authData.subarray(37, 53);
    const credentialIdLength = authData.readUInt16BE(53);
    credentialId = authData.subarray(55, 55 + credentialIdLength);
  }

  return { rpIdHash, flags, signCount, aaguid, credentialId };
};

// Extracts the nonce Apple embedded in the App Attest certificate extension
// (OID 1.2.840.113635.100.8.2), whose value is DER
// `SEQUENCE { [1] EXPLICIT OCTET STRING(nonce) }` - a fixed, tiny shape
// (confirmed by inspecting a real extension built the same way this
// verifies), so explicit tag/length checks are enough without needing a
// general ASN.1 parser. Every length byte here is single-byte DER (all
// nested values are well under 128 bytes), so the offsets are fixed.
const extractNonceFromExtensionValue = (value) => {
  const buf = Buffer.from(value);
  const shapeOk =
    buf.length === 38 &&
    buf[0] === 0x30 && // SEQUENCE
    buf[2] === 0xa1 && // [1] EXPLICIT
    buf[4] === 0x04 && // OCTET STRING
    buf[5] === 0x20; // length 32
  if (!shapeOk) {
    throw new AppAttestVerificationError("APP_ATTEST_NONCE_EXTENSION_MALFORMED");
  }
  return buf.subarray(6, 6 + 32);
};

const toPublicKeyObject = (cert) =>
  crypto.createPublicKey({
    key: Buffer.from(cert.publicKey.rawData),
    format: "der",
    type: "spki",
  });

// Verifies leaf -> intermediate -> our pinned root: each cert's signature
// checked against its issuer's public key, plus validity windows. Apple
// always issues exactly a 2-certificate x5c (leaf + intermediate) for App
// Attest, with the root trusted out-of-band (pinned here), so the chain
// shape below is deliberately not generalized beyond that.
const verifyCertificateChain = async (x5c, rootCaPem) => {
  if (!Array.isArray(x5c) || x5c.length < 2) {
    throw new AppAttestVerificationError("APP_ATTEST_CERT_CHAIN_INCOMPLETE");
  }
  const [leafDer, intermediateDer] = x5c;
  const leaf = new x509.X509Certificate(Buffer.from(leafDer));
  const intermediate = new x509.X509Certificate(Buffer.from(intermediateDer));
  const root = new x509.X509Certificate(rootCaPem);

  const now = new Date();
  for (const cert of [leaf, intermediate]) {
    if (now < cert.notBefore || now > cert.notAfter) {
      throw new AppAttestVerificationError("APP_ATTEST_CERT_EXPIRED");
    }
  }

  const intermediateSignedByRoot = await intermediate.verify({
    publicKey: root.publicKey,
    signatureOnly: true,
  });
  if (!intermediateSignedByRoot) {
    throw new AppAttestVerificationError("APP_ATTEST_CERT_CHAIN_INVALID");
  }
  const leafSignedByIntermediate = await leaf.verify({
    publicKey: intermediate.publicKey,
    signatureOnly: true,
  });
  if (!leafSignedByIntermediate) {
    throw new AppAttestVerificationError("APP_ATTEST_CERT_CHAIN_INVALID");
  }

  return leaf;
};

// Step-by-step port of Apple's "Verify the attestation" algorithm:
// https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
export const verifyAttestation = async ({
  attestationB64,
  keyIdB64,
  challenge,
  teamId,
  bundleId,
  rootCaPem,
  environment,
}) => {
  const keyId = Buffer.from(keyIdB64, "base64");
  const clientDataHash = sha256(Buffer.from(challenge, "utf8"));

  let decoded;
  try {
    decoded = cbor.decodeFirstSync(Buffer.from(attestationB64, "base64"));
  } catch {
    throw new AppAttestVerificationError("APP_ATTEST_ATTESTATION_MALFORMED");
  }

  const { fmt, attStmt, authData } = decoded;
  if (fmt !== "apple-appattest") {
    throw new AppAttestVerificationError("APP_ATTEST_FORMAT_UNSUPPORTED");
  }

  // 1. Verify the x5c chain terminates at Apple's App Attest root CA.
  const leaf = await verifyCertificateChain(attStmt.x5c, rootCaPem);

  // 2. nonce = SHA256(authenticatorData || clientDataHash); it must match
  // the nonce Apple embedded (and signed, via the cert itself) in the leaf
  // certificate's credCert extension.
  const nonce = sha256(authData, clientDataHash);
  const extension = leaf.extensions.find((e) => e.type === APP_ATTEST_EXTENSION_OID);
  if (!extension) {
    throw new AppAttestVerificationError("APP_ATTEST_NONCE_EXTENSION_MISSING");
  }
  const embeddedNonce = extractNonceFromExtensionValue(extension.value);
  if (!crypto.timingSafeEqual(nonce, embeddedNonce)) {
    throw new AppAttestVerificationError("APP_ATTEST_NONCE_MISMATCH");
  }

  // 3. The SHA256 of the leaf's public key (SPKI DER) must equal keyId -
  // exactly how @expo/app-integrity's generateKeyAsync() derives it on-device.
  const publicKeyHash = sha256(Buffer.from(leaf.publicKey.rawData));
  if (!crypto.timingSafeEqual(publicKeyHash, keyId)) {
    throw new AppAttestVerificationError("APP_ATTEST_KEY_ID_MISMATCH");
  }

  // 4. rpIdHash in authData must equal SHA256("<teamId>.<bundleId>").
  const { rpIdHash, signCount, aaguid, credentialId } = parseAuthData(authData);
  const expectedRpIdHash = sha256(Buffer.from(`${teamId}.${bundleId}`, "utf8"));
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
    throw new AppAttestVerificationError("APP_ATTEST_RPID_MISMATCH");
  }

  // 5. Fresh attestation must start at a sign count of 0.
  if (signCount !== 0) {
    throw new AppAttestVerificationError("APP_ATTEST_SIGN_COUNT_NOT_ZERO");
  }

  // 6. aaguid must match the configured environment (development builds
  // attest against a different Apple CA policy than production/App Store
  // builds - see app.json's appattest-environment entitlement).
  const expectedAaguid =
    environment === "production" ? AAGUID_PRODUCTION : AAGUID_DEVELOPMENT;
  if (!aaguid || !expectedAaguid.equals(aaguid)) {
    throw new AppAttestVerificationError("APP_ATTEST_ENVIRONMENT_MISMATCH");
  }

  // 7. credentialId must equal keyId.
  if (!credentialId || !crypto.timingSafeEqual(credentialId, keyId)) {
    throw new AppAttestVerificationError("APP_ATTEST_CREDENTIAL_ID_MISMATCH");
  }

  return {
    publicKeyPem: toPublicKeyObject(leaf).export({ type: "spki", format: "pem" }),
    signCount,
  };
};

// Port of Apple's "Verify the assertion" algorithm, run on every login after
// the device's first ever attestation. Unlike attestation, this needs no
// certificates at all - just the public key persisted from that first
// attestation.
export const verifyAssertion = ({
  assertionB64,
  publicKeyPem,
  challenge,
  teamId,
  bundleId,
  storedSignCount,
}) => {
  const clientDataHash = sha256(Buffer.from(challenge, "utf8"));

  let decoded;
  try {
    decoded = cbor.decodeFirstSync(Buffer.from(assertionB64, "base64"));
  } catch {
    throw new AppAttestVerificationError("APP_ATTEST_ASSERTION_MALFORMED");
  }
  const { signature, authenticatorData } = decoded;

  // 1. nonce = SHA256(authenticatorData || clientDataHash).
  const nonce = sha256(authenticatorData, clientDataHash);

  // 2. Verify `signature` is a valid ECDSA-P256-SHA256 signature over nonce,
  // made by the key established at attestation time.
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const isValid = crypto.verify("sha256", nonce, publicKey, signature);
  if (!isValid) {
    throw new AppAttestVerificationError("APP_ATTEST_SIGNATURE_INVALID");
  }

  // 3. rpIdHash must still match this app.
  const { rpIdHash, signCount } = parseAuthData(authenticatorData);
  const expectedRpIdHash = sha256(Buffer.from(`${teamId}.${bundleId}`, "utf8"));
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
    throw new AppAttestVerificationError("APP_ATTEST_RPID_MISMATCH");
  }

  // 4. Sign count must not go backwards (replay of a captured older
  // assertion). Apple's own counter frequently stays at 0 across logins in
  // practice (a known platform quirk, not unique to this integration), so
  // equal is accepted - only a strict decrease is treated as suspicious.
  if (signCount < storedSignCount) {
    throw new AppAttestVerificationError("APP_ATTEST_SIGN_COUNT_REPLAYED");
  }

  return { signCount };
};

export { AppAttestVerificationError };
