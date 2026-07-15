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

// Blog cover images. Same memoryStorage + sharp re-encode rationale as
// uploadLogo: the mimetype filter here is only a fast first pass; blog.service
// re-encodes the buffer through sharp under a server-generated name, which is
// the real "is this actually an image" check.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError("Image must be a PNG, JPEG, or WebP file."));
      return;
    }
    cb(null, true);
  },
}).single("image");

// Invoice attachments (receipts/supporting documents). Unlike images these
// are NOT re-encoded — we store the original bytes — so the type filter is a
// real gate, not just a first pass. It's still only advisory (a client can lie
// about Content-Type), which is why the stored file is written under a
// server-generated name, served with a fixed non-executable disposition, and
// never placed under the public static mount. memoryStorage keeps the
// client's original filename off disk entirely.
const ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError("Attachments must be a PDF, PNG, JPEG, or WebP file."));
      return;
    }
    cb(null, true);
  },
}).single("file");

// XML import files, forwarded to export-worker for hardened (XXE-safe)
// parsing. memoryStorage: the buffer is streamed to export-worker over the
// internal network and never written to this container's disk.
const XML_MIME_TYPES = new Set(["application/xml", "text/xml", "text/plain"]);
const MAX_XML_SIZE_BYTES = 5 * 1024 * 1024;

export const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_XML_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!XML_MIME_TYPES.has(file.mimetype) && !file.originalname.toLowerCase().endsWith(".xml")) {
      cb(new ValidationError("Only XML files are accepted."));
      return;
    }
    cb(null, true);
  },
}).single("file");

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
