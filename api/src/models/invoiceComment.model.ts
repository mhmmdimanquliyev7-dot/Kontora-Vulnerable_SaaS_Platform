import { Schema, model, type InferSchemaType } from "mongoose";

// Comments intentionally live in MongoDB, not Postgres: they're an
// unstructured, append-mostly side-feature (no foreign keys, no relational
// integrity needed against them) — a reasonable fit for a document store,
// and it gives this app a genuine second-database story rather than Mongo
// sitting there unused. Tenant isolation is NOT a Mongo-level constraint
// (Mongo doesn't know about companies) — every query in
// invoiceComment.service.ts filters by companyId explicitly, and the
// invoice itself is ownership-checked against Postgres before any comment
// read/write is allowed, the same IDOR-safe pattern used everywhere else in
// this codebase.
const invoiceCommentSchema = new Schema(
  {
    companyId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    // Denormalized snapshot of the author's name at post time (like a git
    // commit's author field) — a later name change shouldn't rewrite history.
    authorName: { type: String, required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

invoiceCommentSchema.index({ companyId: 1, invoiceId: 1, createdAt: 1 });

export type InvoiceCommentDocument = InferSchemaType<typeof invoiceCommentSchema>;
export const InvoiceComment = model("InvoiceComment", invoiceCommentSchema);
