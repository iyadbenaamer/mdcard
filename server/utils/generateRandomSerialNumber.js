import crypto from "crypto";

const SERIAL_LENGTH = 15;
const SERIAL_MODULO = 10n ** BigInt(SERIAL_LENGTH);

const generateRandomSerialNumber = () => {
  const bytes = crypto.randomBytes(8);
  const value = BigInt(`0x${bytes.toString("hex")}`) % SERIAL_MODULO;
  return value.toString().padStart(SERIAL_LENGTH, "0");
};
export default generateRandomSerialNumber;
