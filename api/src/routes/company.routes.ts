import { Router } from "express";

import * as companyController from "@/controllers/company.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadLogo } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { updateCompanySchema } from "@/validation/company.schemas.js";

export const companyRouter = Router();

// Every role may view basic company info (name/logo aren't sensitive), but
// only OWNER may change it.
const ownerOnly = requireRole(Role.OWNER);

companyRouter.get("/", companyController.getOne);
companyRouter.patch("/", ownerOnly, validateBody(updateCompanySchema), companyController.update);
companyRouter.post("/logo", ownerOnly, uploadLogo, companyController.uploadLogo);
