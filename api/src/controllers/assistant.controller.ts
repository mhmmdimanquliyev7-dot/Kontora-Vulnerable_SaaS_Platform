import type { Request, Response } from "express";

import * as assistantService from "@/services/assistant.service.js";

export async function chat(req: Request, res: Response): Promise<void> {
  const reply = await assistantService.answerQuestion(
    { userId: req.auth!.userId, companyId: req.auth!.companyId, role: req.auth!.role },
    req.body.message,
  );
  res.status(200).json({ reply });
}
