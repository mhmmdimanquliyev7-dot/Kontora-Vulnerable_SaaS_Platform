import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { importInvoiceXml } from "@/services/exportWorker.client.js";

// Chapter 18 — XXE lab (INTENTIONAL, training only). Private/authenticated
// "Import invoice from XML" preview. Accepts either a real file upload
// (multipart field "file") or pasted XML (multipart text field "xml") —
// either way it's forwarded to export-worker's unhardened parser and the
// parsed fields (or the raw parse error) are echoed straight back.
export async function preview(req: Request, res: Response): Promise<void> {
  let buffer: Buffer;
  let mimetype: string;
  let originalname: string;

  if (req.file) {
    buffer = req.file.buffer;
    mimetype = req.file.mimetype || "application/xml";
    originalname = req.file.originalname;
  } else if (typeof req.body?.xml === "string" && req.body.xml.trim().length > 0) {
    buffer = Buffer.from(req.body.xml, "utf-8");
    mimetype = "application/xml";
    originalname = "pasted.xml";
  } else {
    throw new ValidationError(
      'Provide an XML file upload (field "file") or pasted XML (field "xml").',
    );
  }

  const preview = await importInvoiceXml({ buffer, mimetype, originalname });
  res.status(200).json({ preview });
}
