import crypto from "crypto";

const getEncryptionKey = () => {
  const secret = process.env.CARD_CODE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CARD_CODE_SECRET_MISSING");
  }
  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptCardCode = (plainText) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
};

export const decryptCardCode = (payload) => {
  const parts = payload?.split(".");
  if (!parts || parts.length !== 3) {
    throw new Error("CARD_CODE_INVALID_PAYLOAD");
  }

  const [ivBase64, tagBase64, dataBase64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(dataBase64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
