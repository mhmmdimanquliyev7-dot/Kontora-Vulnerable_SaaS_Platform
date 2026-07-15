import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { ValidationError } from "@/lib/errors.js";
import { LOGOS_DIR } from "@/lib/uploads.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";

const LOGO_MAX_DIMENSION = 512;

export async function getCompany(companyId: string) {
  return prisma.company.findUniqueOrThrow({ where: { id: companyId } });
}

export interface CompanyProfileInput {
  name?: string;
  website?: string;
  address?: string;
  description?: string;
}

export async function updateCompanyProfile(
  companyId: string,
  actorUserId: string,
  input: CompanyProfileInput,
) {
  const company = await prisma.company.update({ where: { id: companyId }, data: input });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "company.updated",
    entityType: "Company",
    entityId: companyId,
    metadata: { fields: Object.keys(input) },
  });
  return company;
}

// The filename is always server-generated from companyId — never derived
// from the client-supplied original filename — so there's no path-traversal
// surface here. Re-encoding through sharp (rather than trusting and just
// saving the uploaded bytes) also means the stored file is guaranteed to be
// a genuine raster image: sharp throws on anything it can't decode as one,
// which is a stronger check than trusting the client's Content-Type.
export async function updateCompanyLogo(
  companyId: string,
  actorUserId: string,
  fileBuffer: Buffer,
) {
  let resized: Buffer;
  try {
    resized = await sharp(fileBuffer)
      .resize(LOGO_MAX_DIMENSION, LOGO_MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    throw new ValidationError("The uploaded file is not a valid image.");
  }

  await mkdir(LOGOS_DIR, { recursive: true });
  const filename = `${companyId}.png`;
  await writeFile(path.join(LOGOS_DIR, filename), resized);

  const logoUrl = `/uploads/logos/${filename}`;
  const company = await prisma.company.update({ where: { id: companyId }, data: { logoUrl } });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "company.logo_updated",
    entityType: "Company",
    entityId: companyId,
  });

  return company;
}
