import axios from "axios";

// pay.net.ly (TDSP / "tlync") hosted-payment API. Docs portal:
// https://dev-merchant.pay.net.ly/apidocs/index.html
//
// The doc site's route labels are NOT the real paths. Verified against the
// gateway: base https://uat-api.tlync.ly (test) / https://api.tlync.ly (prod),
// initiate /api/v1/payment/initiate, receipt /api/v1/cp-payment/receipt.
// All three are env-overridable, so a path change needs no code change.
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const ensureLeadingSlash = (value) =>
  value.startsWith("/") ? value : `/${value}`;

const DEFAULT_BASE_URL =
  process.env.PAYNET_API_BASE_URL || "https://api.pay.net.ly";
const INITIATE_PATH = ensureLeadingSlash(
  process.env.PAYNET_INITIATE_PATH || "/payment/initiate",
);
const RECEIPT_PATH = ensureLeadingSlash(
  process.env.PAYNET_RECEIPT_PATH || "/receipt/transaction",
);

// Test mode. Purely a label now: top-ups always run the real flow, and
// PAYNET_API_BASE_URL decides whether that is the UAT gateway
// (uat-api.tlync.ly) or production. It drives the "test environment" badge in
// the app/panel, and lets a manual webhook POST complete a top-up locally.
// Read from env on every call so it can be toggled without a restart; defaults
// to ON so going live must be an explicit PAYNET_SANDBOX=false.
export const isSandbox = () => {
  const raw = String(process.env.PAYNET_SANDBOX ?? "").toLowerCase().trim();
  if (["0", "false", "no", "off"].includes(raw)) return false;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  return true;
};


// Treat the shipped placeholder as "not configured" so an un-set-up deployment
// fails loudly with PAYNET_CREDENTIALS_MISSING instead of firing a doomed
// request at the gateway.
const isPlaceholder = (value) => !value || value === "REPLACE_ME";

const getConfig = () => {
  const token = process.env.PAYNET_API_TOKEN;
  const storeId = process.env.PAYNET_STORE_ID;

  if (isPlaceholder(token) || isPlaceholder(storeId)) {
    const error = new Error("PAYNET_CREDENTIALS_MISSING");
    error.code = "PAYNET_CREDENTIALS_MISSING";
    throw error;
  }

  return { token, storeId };
};

const getAxiosClient = (token) =>
  axios.create({
    baseURL: trimTrailingSlash(DEFAULT_BASE_URL),
    headers: {
      Authorization: `Bearer ${token}`,
      // The provider's working Postman example posts form-encoded bodies. If
      // pay.net.ly ever rejects this, switch the two calls below to JSON - it
      // is the only thing that would need to change.
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    timeout: Number(process.env.PAYNET_API_TIMEOUT_MS || 30000),
  });

const toPaynetError = (error) => {
  const status = error?.response?.status;
  if (!status) {
    return error;
  }

  const data = error?.response?.data;
  const message =
    (data && typeof data === "object" && data.message) || "PAYNET_REQUEST_FAILED";

  const transformed = new Error(message);
  transformed.code = "PAYNET_REQUEST_FAILED";
  transformed.status = status;
  transformed.paynetMessage =
    (data && typeof data === "object" && data.message) || null;
  transformed.paynetErrors =
    (data && typeof data === "object" && data.errors) || null;
  return transformed;
};

// POST /payment/initiate - registers a payment and returns the hosted page URL
// the customer is sent to. Response body: { result, custom_ref, url }.
export const initiatePayment = async ({
  amount,
  phone,
  email,
  customRef,
  backendUrl,
  frontendUrl,
  failedFrontendUrl,
}) => {
  const { token, storeId } = getConfig();
  const client = getAxiosClient(token);

  const body = new URLSearchParams({
    id: storeId,
    amount: String(amount),
    phone: phone || "",
    backend_url: backendUrl,
    frontend_url: frontendUrl,
    custom_ref: customRef,
  });
  // email is optional to the gateway, but only if omitted entirely - an empty
  // value fails its "must be a valid email" rule. Left out by default so the
  // customer types their own on the hosted page.
  if (email) body.set("email", email);
  // Separate redirect target for a failed/cancelled payment (legacy T-lync
  // param, still accepted). The mobile WebView tells success from failure by
  // which of these URLs the hosted page redirects to.
  if (failedFrontendUrl) body.set("failed_front_end_url", failedFrontendUrl);

  try {
    const response = await client.post(INITIATE_PATH, body);
    return response.data;
  } catch (error) {
    throw toPaynetError(error);
  }
};

// POST /receipt/transaction - the authoritative status/receipt lookup. Pass
// either customRef (what we sent to initiate) or transactionRef. Returns
// { result: "success", data: {...} } when complete, { result: "incomplete" }
// when the payment exists but is unpaid, or throws a 404 PAYNET_REQUEST_FAILED
// when the reference is unknown.
export const getReceipt = async ({ customRef, transactionRef }) => {
  const { token, storeId } = getConfig();
  const client = getAxiosClient(token);

  const body = new URLSearchParams({ store_id: storeId });
  if (transactionRef) body.set("transaction_ref", transactionRef);
  if (customRef) body.set("custom_ref", customRef);

  try {
    const response = await client.post(RECEIPT_PATH, body);
    return response.data;
  } catch (error) {
    throw toPaynetError(error);
  }
};
