import path from "node:path";

// Publicly-served static assets. Everything under UPLOADS_ROOT is exposed by
// the app.ts `express.static("/uploads", ...)` mount with a cross-origin
// resource policy — so ONLY genuinely public files belong here: company
// logos and blog cover images, both re-encoded through sharp before they land
// on disk under server-generated names.
export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
export const LOGOS_DIR = path.join(UPLOADS_ROOT, "logos");
export const BLOG_IMAGES_DIR = path.join(UPLOADS_ROOT, "blog");

// Private storage — deliberately OUTSIDE UPLOADS_ROOT so it is never reachable
// through the static mount. Invoice attachments (receipts, documents) live
// here and are only ever served back through the authenticated, tenant-scoped
// download controller (attachment.controller.ts), which looks a file up by its
// database row before streaming it. Persisted by the `api_storage` compose
// volume, same as uploads is by `api_uploads`.
export const STORAGE_ROOT = path.resolve(process.cwd(), "storage");
export const ATTACHMENTS_DIR = path.join(STORAGE_ROOT, "attachments");
