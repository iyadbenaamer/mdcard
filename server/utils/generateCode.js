import crypto from "crypto";

export const generateCode = (digits) => {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return crypto.randomInt(min, max).toString();
};
