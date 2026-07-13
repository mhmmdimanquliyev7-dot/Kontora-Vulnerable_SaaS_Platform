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

const CSV_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]);
const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;

// Same memoryStorage rationale as uploadLogo: the buffer is forwarded
// straight to report-service over the internal network and never written to
// this container's disk. CSV mimetypes are notoriously inconsistent across
// browsers/OSes (Excel-exported CSVs often show up as
// application/vnd.ms-excel), so this is a permissive first-pass filter —
// report-service's own parser is the actual validation, same layered
// approach as the image re-encode step for logo uploads.
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!CSV_MIME_TYPES.has(file.mimetype) && !file.originalname.toLowerCase().endsWith(".csv")) {
      cb(new ValidationError("Only CSV files are accepted."));
      return;
    }
    cb(null, true);
  },
}).single("file");
