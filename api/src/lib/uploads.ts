import path from "node:path";

export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
export const LOGOS_DIR = path.join(UPLOADS_ROOT, "logos");
