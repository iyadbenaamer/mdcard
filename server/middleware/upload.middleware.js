import multer from "multer";
import path from "path";

const storagePath = path.join(process.cwd(), "public", "storage");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storagePath);
  },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || "")
      .slice(0, 10)
      .toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });
