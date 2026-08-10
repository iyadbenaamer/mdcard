/**
 * Calculate effective buy price based on buyPriceUsd and dollarRate.
 * Priority: buyPriceUsd × dollarRate (if buyPriceUsd exists) > buyPrice
 * At least one of them must have a value.
 *
 * @param {number} buyPrice - Regular buy price
 * @param {number|null} buyPriceUsd - Buy price in USD (nullable)
 * @param {number} dollarRate - Dollar rate setting value (or default 1 if not found)
 * @returns {number} Effective buy price
 */
export const getEffectiveBuyPrice = (buyPrice, buyPriceUsd, dollarRate) => {
  const rate = Number(dollarRate) || 1;

  // Priority: buyPriceUsd × dollarRate if buyPriceUsd exists
  if (
    buyPriceUsd !== null &&
    buyPriceUsd !== undefined &&
    !Number.isNaN(Number(buyPriceUsd))
  ) {
    const usdPrice = Number(buyPriceUsd);
    if (usdPrice > 0) {
      return Math.round((usdPrice * rate + Number.EPSILON) * 100) / 100;
    }
  }

  // Fallback to regular buyPrice
  return Number(buyPrice) || 0;
};

export const getTierPriceForUser = ({
  userRole,
  buyPrice,
  buyPriceUsd,
  sellPrice,
  customBuyPrice,
  dollarRate,
}) => {
  if (userRole === "individual") {
    return Number(sellPrice) || 0;
  }

  if (
    customBuyPrice !== null &&
    customBuyPrice !== undefined &&
    !Number.isNaN(Number(customBuyPrice))
  ) {
    return Number(customBuyPrice);
  }

  return getEffectiveBuyPrice(buyPrice, buyPriceUsd, dollarRate);
};

/**
 * Format price for display (end user should not see the calculation details)
 * @param {number} price - Price to format
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
  const amount = Number(price);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("ar-LY", {
    style: "currency",
    currency: "LYD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};
