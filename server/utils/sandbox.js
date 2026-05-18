import { config } from "dotenv";

config();
export const isSandboxMode = () => {
  const rawFlag = String(
    process.env.SANDBOX_MODE || process.env.SANDBOX || "",
  ).toLowerCase();
  if (["1", "true", "yes", "on"].includes(rawFlag)) {
    return true;
  }

  const env = String(
    process.env.APP_ENV || process.env.NODE_ENV || "",
  ).toLowerCase();
  return env === "sandbox";
};
