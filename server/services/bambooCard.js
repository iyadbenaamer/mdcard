import axios from "axios";
import crypto from "crypto";

const DEFAULT_BASE_URL =
  process.env.BAMBOO_API_BASE_URL ||
  "https://api.bamboocardportal.com/api/integration/v1.0";
const DEFAULT_PLACE_ORDER_PATH =
  process.env.BAMBOO_PLACE_ORDER_PATH || "orders/checkout";
const DEFAULT_GET_ORDER_PATH =
  process.env.BAMBOO_GET_ORDER_PATH || "orders/{requestId}";
const DEFAULT_GET_ACCOUNTS_PATH =
  process.env.BAMBOO_GET_ACCOUNTS_PATH || "accounts";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const resolvePath = (template, orderId) => {
  const normalized = String(template || "").trim() || "orders";
  const safeOrderId = encodeURIComponent(String(orderId || ""));

  if (!safeOrderId) {
    return normalized;
  }

  if (normalized.includes("{orderId}")) {
    return normalized.replaceAll("{orderId}", safeOrderId);
  }

  if (normalized.includes("{requestId}")) {
    return normalized.replaceAll("{requestId}", safeOrderId);
  }

  if (normalized.includes("{id}")) {
    return normalized.replaceAll("{id}", safeOrderId);
  }

  if (normalized.includes(":orderId")) {
    return normalized.replaceAll(":orderId", safeOrderId);
  }

  if (normalized.includes(":requestId")) {
    return normalized.replaceAll(":requestId", safeOrderId);
  }

  // Generic fallback: replace a single `{...Id}` token if present.
  if (/\{[^}]*id\}/i.test(normalized)) {
    return normalized.replace(/\{[^}]*id\}/i, safeOrderId);
  }

  return normalized.replace(/\/$/, "") + `/${safeOrderId}`;
};

const getAxiosClient = () => {
  const clientId = process.env.BAMBOO_CLIENT_ID;
  const clientSecret = process.env.BAMBOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error("BAMBOO_CREDENTIALS_MISSING");
    error.code = "BAMBOO_CREDENTIALS_MISSING";
    throw error;
  }

  return axios.create({
    baseURL: trimTrailingSlash(DEFAULT_BASE_URL),
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`,
      ).toString("base64")}`,
    },
    timeout: Number(process.env.BAMBOO_API_TIMEOUT_MS || 30000),
  });
};

const pickFirst = (value, keys) => {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null && value[key] !== "") {
      return value[key];
    }
  }
  return undefined;
};

const unwrapCandidates = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.accounts)) return payload.accounts;
  if (Array.isArray(payload.cards)) return payload.cards;
  if (Array.isArray(payload.items)) {
    return payload.items.flatMap((item) =>
      Array.isArray(item?.cards) ? item.cards : [item],
    );
  }
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.order?.cards)) return payload.order.cards;
  if (Array.isArray(payload.order?.items)) return payload.order.items;
  if (Array.isArray(payload.response?.cards)) return payload.response.cards;
  if (Array.isArray(payload.response?.items)) return payload.response.items;
  return [payload.card || payload.order || payload];
};

const normalizeAccount = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const nested =
    entry.account && typeof entry.account === "object" ? entry.account : entry;
  const accountId = pickFirst(nested, ["id", "accountId", "accountID"]);
  if (accountId === undefined || accountId === null || accountId === "") {
    return null;
  }

  const balanceValue = pickFirst(nested, [
    "balance",
    "availableBalance",
    "available_balance",
  ]);
  const balanceNumber = Number(balanceValue);

  return {
    id: String(accountId),
    balance: Number.isNaN(balanceNumber) ? null : balanceNumber,
    currency: pickFirst(nested, ["currency", "currencyCode"]) ?? null,
    isActive: Boolean(pickFirst(nested, ["isActive", "active"])),
    sandboxMode: Boolean(pickFirst(nested, ["sandboxMode", "sandbox"])),
    raw: nested,
  };
};

const normalizeAccountList = (payload) =>
  unwrapCandidates(payload).map(normalizeAccount).filter(Boolean);

const normalizeCard = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const nested =
    entry.card && typeof entry.card === "object" ? entry.card : entry;
  const code = pickFirst(nested, [
    "code",
    "cardCode",
    "voucherCode",
    "redemptionCode",
    "secret",
    "pin",
  ]);
  const serialNumber = pickFirst(nested, [
    "serialNumber",
    "serial",
    "serialNo",
    "serial_no",
    "referenceNumber",
  ]);
  const externalCardId = pickFirst(nested, ["id", "cardId", "referenceId"]);
  const pin = pickFirst(nested, ["pin", "cardPin", "securityPin"]);
  const expiryDate = pickFirst(nested, [
    "expiryDate",
    "expirationDate",
    "expiresAt",
    "validUntil",
    "expiry",
    "expiration",
    "dateExpiry",
  ]);

  return {
    code: code === undefined ? null : String(code),
    serialNumber: serialNumber === undefined ? null : String(serialNumber),
    externalCardId:
      externalCardId === undefined ? null : String(externalCardId),
    pin: pin === undefined ? null : String(pin),
    expiryDate: expiryDate === undefined ? null : String(expiryDate),
    status: pickFirst(nested, ["status", "state"]) ?? null,
    raw: nested,
  };
};

const normalizeOrderData = (payload) => {
  if (typeof payload === "string") {
    return {
      orderId: payload,
      requestId: payload,
      status: null,
      cards: [],
      raw: payload,
    };
  }

  const order =
    payload?.order && typeof payload.order === "object"
      ? payload.order
      : payload;
  const requestId = pickFirst(order, [
    "requestId",
    "requestID",
    "id",
    "reference",
    "referenceNumber",
  ]);
  const orderId = pickFirst(order, ["orderId", "orderID", "orderNumber"]);

  const cards = unwrapCandidates(payload).map(normalizeCard).filter(Boolean);

  return {
    orderId:
      requestId !== undefined && requestId !== null
        ? String(requestId)
        : orderId === undefined
          ? null
          : String(orderId),
    requestId: requestId === undefined ? null : String(requestId),
    providerOrderId: orderId === undefined ? null : String(orderId),
    status: pickFirst(order, ["status", "state", "orderStatus"]) ?? null,
    cards,
    raw: payload,
  };
};

const toBambooStockError = (message, status, error) => {
  const normalizedMessage = message.toLowerCase();
  if (
    !normalizedMessage.includes("not enough") ||
    !normalizedMessage.includes("in stock")
  ) {
    return null;
  }

  const requestedMatch = message.match(/requested\s*:\s*(\d+)/i);
  const inStockMatch = message.match(/in\s*stock\s*:\s*(\d+)/i);
  const productMatch = message.match(
    /for\s+product\s+(.+?)\.\s*requested\s*:/i,
  );

  const transformed = new Error("BAMBOO_OUT_OF_STOCK");
  transformed.code = "BAMBOO_OUT_OF_STOCK";
  transformed.product = productMatch?.[1]?.trim() || null;
  transformed.requested = requestedMatch ? Number(requestedMatch[1]) : null;
  transformed.available = inStockMatch ? Number(inStockMatch[1]) : 0;
  transformed.providerMessage = message;
  transformed.status = status;
  transformed.correlationId =
    error?.response?.headers?.["x-correlation-id"] || null;
  return transformed;
};

// Matches e.g. "Account doesn't have enough funds available to buy the
// card(s) requested. Balance: 39.4554. Reserved balance: 0.0000. Additional
// top-up required: 7.7946" — the provider account itself is short on funds,
// distinct from a specific product being out of stock.
const toBambooFundsError = (message, status, error) => {
  const normalizedMessage = message.toLowerCase();
  if (!normalizedMessage.includes("enough funds")) {
    return null;
  }

  const balanceMatch = message.match(
    /(?<!reserved\s)balance\s*:\s*(\d+(?:\.\d+)?)/i,
  );
  const reservedMatch = message.match(
    /reserved\s*balance\s*:\s*(\d+(?:\.\d+)?)/i,
  );
  const topUpMatch = message.match(/top-up required\s*:\s*(\d+(?:\.\d+)?)/i);

  const transformed = new Error("BAMBOO_INSUFFICIENT_FUNDS");
  transformed.code = "BAMBOO_INSUFFICIENT_FUNDS";
  transformed.balance = balanceMatch ? Number(balanceMatch[1]) : null;
  transformed.reservedBalance = reservedMatch ? Number(reservedMatch[1]) : null;
  transformed.topUpRequired = topUpMatch ? Number(topUpMatch[1]) : null;
  transformed.providerMessage = message;
  transformed.status = status;
  transformed.correlationId =
    error?.response?.headers?.["x-correlation-id"] || null;
  return transformed;
};

const toBambooCheckoutError = (error) => {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.reason ||
    error?.message ||
    "";

  if (status !== 400 || typeof message !== "string") {
    return null;
  }

  return (
    toBambooStockError(message, status, error) ||
    toBambooFundsError(message, status, error)
  );
};

export const placeBambooOrder = async ({
  productId,
  accountId,
  value,
  quantity,
  reference,
  metadata = {},
}) => {
  const client = getAxiosClient();
  const resolvedAccountId = String(
    accountId || process.env.BAMBOO_ACCOUNT_ID || "",
  ).trim();
  if (!resolvedAccountId) {
    const error = new Error("BAMBOO_ACCOUNT_ID_MISSING");
    error.code = "BAMBOO_ACCOUNT_ID_MISSING";
    throw error;
  }

  const requestId = crypto.randomUUID();
  const payload = {
    requestId,
    accountId: resolvedAccountId,
    products: [
      {
        productId: String(productId),
        value: Number(value),
        quantity: Number(quantity),
      },
    ],
  };

  if (reference || metadata) {
    payload.reference = reference;
    payload.metadata = metadata;
  }

  try {
    const response = await client.post(DEFAULT_PLACE_ORDER_PATH, payload);
    return normalizeOrderData(response.data);
  } catch (error) {
    const checkoutError = toBambooCheckoutError(error);
    if (checkoutError) {
      throw checkoutError;
    }
    throw error;
  }
};

export const getBambooOrder = async (orderId) => {
  const client = getAxiosClient();
  const response = await client.get(
    resolvePath(DEFAULT_GET_ORDER_PATH, orderId),
  );
  return normalizeOrderData(response.data);
};

export const getBambooAccounts = async () => {
  const client = getAxiosClient();
  const response = await client.get(DEFAULT_GET_ACCOUNTS_PATH);
  return normalizeAccountList(response.data);
};

const resolveBambooAccountId = async (accountId) => {
  const explicitAccountId = String(accountId || "").trim();
  if (explicitAccountId) {
    return explicitAccountId;
  }

  const fallbackAccountId = String(process.env.BAMBOO_ACCOUNT_ID || "").trim();
  if (fallbackAccountId) {
    return fallbackAccountId;
  }

  const accounts = await getBambooAccounts();
  const activeAccounts = accounts.filter((account) => account.isActive);
  const candidates = activeAccounts.length > 0 ? activeAccounts : accounts;

  if (!candidates.length) {
    const error = new Error("BAMBOO_ACCOUNT_ID_MISSING");
    error.code = "BAMBOO_ACCOUNT_ID_MISSING";
    throw error;
  }

  candidates.sort((left, right) => {
    const leftBalance = Number(left.balance ?? -Infinity);
    const rightBalance = Number(right.balance ?? -Infinity);
    if (rightBalance !== leftBalance) {
      return rightBalance - leftBalance;
    }
    return Number(left.id) - Number(right.id);
  });

  return candidates[0].id;
};

export const placeAndResolveBambooOrder = async ({
  productId,
  accountId,
  value,
  quantity,
  reference,
  metadata = {},
}) => {
  const requestedQuantity = Math.max(1, Number(quantity) || 1);
  const pollAttempts = Math.max(
    1,
    Number(process.env.BAMBOO_ORDER_POLL_ATTEMPTS || 10),
  );
  const pollIntervalMs = Math.max(
    0,
    Number(process.env.BAMBOO_ORDER_POLL_INTERVAL_MS || 1500),
  );
  const backoffFactor = Math.max(
    1,
    Number(process.env.BAMBOO_ORDER_POLL_BACKOFF || 1.5),
  );

  let latest = await placeBambooOrder({
    productId,
    accountId: await resolveBambooAccountId(accountId),
    value,
    quantity: requestedQuantity,
    reference,
    metadata,
  });

  const hasEnoughCards = () =>
    latest.cards.length >= requestedQuantity &&
    latest.cards.slice(0, requestedQuantity).every((card) => card?.code);

  if (hasEnoughCards()) {
    return latest;
  }

  const orderId = latest.orderId;
  if (!orderId) {
    return latest;
  }

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const delay = Math.round(pollIntervalMs * Math.pow(backoffFactor, attempt));
    if (delay > 0) {
      await sleep(delay);
    }

    latest = await getBambooOrder(orderId);
    if (hasEnoughCards()) {
      return latest;
    }
  }

  return latest;
};
