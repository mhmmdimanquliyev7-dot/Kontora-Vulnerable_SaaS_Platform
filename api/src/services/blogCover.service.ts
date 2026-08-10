import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { BLOG_MEDIA_DIR } from "@/lib/uploads.js";
import { getCompanyPost } from "@/services/blog.service.js";
import { recordActivity } from "@/services/activity.service.js";

// Chapter 16 — unrestricted file upload -> RCE lab (INTENTIONAL, training only).
//
// The blog cover upload runs FOUR checks that each look protective but are each
// bypassable. A polyglot named `shell.php.png`, part Content-Type `image/png`,
// whose body is PNG magic bytes followed by `<?php ... ?>`, passes all four:
//   1. spoofed MIME header,
//   2. valid leading image signature,
//   3. last extension (.png) not in the blacklist,
//   4. filename ends with .png (whitelist).
// The file is then written under its ORIGINAL, unsanitized filename into the
// shared blog_media volume, which the report-service serves at /media/blog with
// a .php handler — so requesting /media/blog/shell.php.png executes it as PHP.

const BLACKLISTED_EXTS = new Set(["php", "php3", "php4", "php5", "phtml", "phar", "pht"]);
const WHITELISTED_EXTS = new Set(["png", "jpg", "jpeg", "webp"]);

// FLAW: only inspects the LEADING bytes. A file that starts with a valid image
// signature and then contains PHP source still "looks like an image" here.
function hasImageSignature(buf: Buffer): boolean {
  // PNG: 89 50 4E 47
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return true;
  }
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }
  // WebP: "RIFF"...."WEBP"
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return true;
  }
  return false;
}

export interface UploadedCover {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export async function saveCoverImage(
  companyId: string,
  actorUserId: string,
  postId: string,
  file: UploadedCover,
) {
  // Tenant/authorship scope: a post id from another company reads as a 404.
  await getCompanyPost(companyId, postId);

  // Filter 1 — MIME check.
  // FLAW: trusts the client-supplied multipart part header, which is spoofable.
  if (!file.mimetype.toLowerCase().startsWith("image/")) {
    throw new ValidationError("Cover rejected: the file's Content-Type must be an image/* type.");
  }

  // Filter 2 — magic-number check.
  // FLAW: only the leading bytes are checked (see hasImageSignature).
  if (!hasImageSignature(file.buffer)) {
    throw new ValidationError(
      "Cover rejected: the file does not start with a valid image signature.",
    );
  }

  // Filter 3 — extension BLACKLIST.
  // FLAW: only the LAST extension is examined, so `shell.php.png` (last ext .png)
  // slips past a blacklist aimed at `.php`.
  const dot = file.originalname.lastIndexOf(".");
  const lastExt = dot >= 0 ? file.originalname.slice(dot + 1).toLowerCase() : "";
  if (BLACKLISTED_EXTS.has(lastExt)) {
    throw new ValidationError("Cover rejected: that file extension is not allowed.");
  }

  // Filter 4 — extension WHITELIST.
  if (!WHITELISTED_EXTS.has(lastExt)) {
    throw new ValidationError(
      "Cover rejected: the file must be a .png, .jpg, .jpeg, or .webp image.",
    );
  }

  // Store under the ORIGINAL, unsanitized filename — no rename/UUID, so the
  // multi-extension is preserved — into the shared, PHP-served media volume.
  await mkdir(BLOG_MEDIA_DIR, { recursive: true });
  await writeFile(path.join(BLOG_MEDIA_DIR, file.originalname), file.buffer);

  const coverImageUrl = `/media/blog/${file.originalname}`;
  const updated = await prisma.blogPost.update({
    where: { id: postId },
    data: { coverImageUrl },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "blog.cover_updated",
    entityType: "BlogPost",
    entityId: postId,
  });

  return updated;
}
