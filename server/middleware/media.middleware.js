import fs from "fs";

import { handleError } from "../utils/errorHandler.js";

const uploadsFolder = `/storage/`;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function safeDelete(filePath) {
  const attempts = 5;
  const delays = [50, 120, 300, 800, 1600];
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (err) {
      if (err.code === "ENOENT") return true; // already gone
      if (err.code === "EPERM" || err.code === "EBUSY") {
        if (i < attempts - 1) await wait(delays[i]);
        continue;
      }
      if (process.env.DEBUG_MEDIA === "true") {
        console.warn(
          "[media] delete failed",
          filePath,
          err.code || err.message,
        );
      }
      return false;
    }
  }
  return false;
}
