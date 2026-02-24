export const generateCode = (degits) => {
  let code = 0;
  let base = 1;
  for (let i = 0; i < degits; i++) {
    code = code + 5 * base;
    base *= 10;
  }
  return Math.floor((Math.random() + 0.2) * code).toString();
};
