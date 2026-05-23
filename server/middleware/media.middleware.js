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

export const compressImages = async (req, res, next) => {
  try {
    if (!req.files) return next();
    // Build filesInfo from media (keep legacy 'video' typo)
    const media = req.files.media;

    if (media.length > 100) {
      return res.status(400).json({ code: "MEDIA_TOO_MANY_FILES" });
    }

    const filesInfo = [];
    if (Array.isArray(media)) {
      media.forEach((file) => {
        if (file.mimetype?.startsWith("image")) {
          filesInfo.push({
            path: `${uploadsFolder}${file.filename}`,
            fileType: "photo",
          });
        } else if (file.mimetype?.startsWith("video")) {
          filesInfo.push({
            path: `${uploadsFolder}${file.filename}`,
            fileType: "video",
          });
        }
      });
    }
    req.filesInfo = filesInfo;
  } catch (e) {
    if (process.env.DEBUG_MEDIA === "true")
      console.error("[media] compressImages error", e.message);
  }
  next();
};

export const uploadSingleFile = async (req, res, next) => {
  try {
    // Support both single-file uploads (req.file) and named fields via req.files
    // If using upload.fields, multer will populate req.files with arrays per field.
    if (!req.file && !req.files) return next();

    if (req.file) {
      req.filePath = `${uploadsFolder}${req.file.filename}`;
    }

    if (req.files) {
      // legacy: media field
      if (
        req.files.media &&
        Array.isArray(req.files.media) &&
        req.files.media[0]
      ) {
        req.filePath = `${uploadsFolder}${req.files.media[0].filename}`;
      }
      // new: printImage field
      if (
        req.files.printImage &&
        Array.isArray(req.files.printImage) &&
        req.files.printImage[0]
      ) {
        req.printFilePath = `${uploadsFolder}${req.files.printImage[0].filename}`;
      }
    }
    next();
  } catch (err) {
    return handleError(err, res);
  }
};
