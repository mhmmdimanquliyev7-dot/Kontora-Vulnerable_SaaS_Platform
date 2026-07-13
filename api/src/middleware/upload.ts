import multer from "multer";

import { ValidationError } from "@/lib/errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

// memoryStorage: the file never touches disk under a client-influenced name.
// company.service.ts re-encodes the buffer through sharp (which also
// rejects anything that isn't actually a decodable raster image, since the
// client-supplied mimetype/extension here are just an early, spoofable
// filter) and writes it out itself under a server-generated filename.
export const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError("Logo must be a PNG, JPEG, or WebP image."));
      return;
    }
    cb(null, true);
  },
}).single("logo");
