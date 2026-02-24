export const resolveBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export const safeValue = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return fallback;
  return value;
};

export const formatArabicDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
};

export const formatTransactionType = (type) => {
  switch (type) {
    case "deposit":
      return "إيداع";
    case "purchase":
      return "شراء";
    case "refund":
      return "استرداد";
    default:
      return "—";
  }
};

export const formatAmount = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("ar-LY", {
    style: "currency",
    currency: "LYD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};
