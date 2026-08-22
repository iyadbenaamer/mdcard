import axios from "axios";

const DEFAULT_BASE_URL = process.env.DPAY_API_BASE_URL || "https://dpay.ly/api";

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const getAxiosClient = () => {
  const token = process.env.DPAY_API_KEY;

  if (!token) {
    const error = new Error("DPAY_CREDENTIALS_MISSING");
    error.code = "DPAY_CREDENTIALS_MISSING";
    throw error;
  }

  return axios.create({
    baseURL: trimTrailingSlash(DEFAULT_BASE_URL),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: Number(process.env.DPAY_API_TIMEOUT_MS || 30000),
  });
};

// Dpay's sandbox is a real (test-only) environment reached via a /sandbox
// prefix on the sessions endpoints - not something we fake locally, unlike
// Bamboo's sandbox handling elsewhere in this codebase.
    const sandboxPayment = process.env.SANDBOX_PAYMENT === "true";
const sessionsBasePath = () =>
  sandboxPayment ? "sandbox/payment/sessions" : "payment/sessions";

const toDpayError = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (!status || !data) {
    return error;
  }

  const transformed = new Error(data.message || "DPAY_REQUEST_FAILED");
  transformed.code = "DPAY_REQUEST_FAILED";
  transformed.status = status;
  transformed.dpayMessage = data.message || null;
  transformed.dpayErrors = data.errors || null;
  return transformed;
};

export const openPaymentSession = async ({
  payMethod,
  amount,
  fields = {},
  idempotencyKey,
}) => {
  const client = getAxiosClient();
  const payload = {
    pay_method: payMethod,
    amount,
    ...fields,
  };

  try {
    const response = await client.post(
      `${sessionsBasePath()}/open`,
      payload,
      idempotencyKey
        ? { headers: { "Idempotency-Key": idempotencyKey } }
        : undefined,
    );
    return response.data;
  } catch (error) {
    throw toDpayError(error);
  }
};

export const verifyPaymentSession = async ({ sessionId, otp }) => {
  const client = getAxiosClient();

  try {
    const response = await client.post(`${sessionsBasePath()}/verify`, {
      session_id: sessionId,
      otp,
    });
    return response.data;
  } catch (error) {
    throw toDpayError(error);
  }
};

export const getPaymentSession = async (sessionId) => {
  const client = getAxiosClient();

  try {
    const response = await client.get(`${sessionsBasePath()}/${sessionId}`);
    return response.data;
  } catch (error) {
    throw toDpayError(error);
  }
};
