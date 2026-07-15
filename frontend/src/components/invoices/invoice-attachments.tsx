"use client";

import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAttachments, useDeleteAttachment, useUploadAttachment } from "@/hooks/use-attachments";
import { attachmentDownloadUrl } from "@/lib/api/attachments";
import type { InvoiceAttachment } from "@/lib/api/types";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InvoiceAttachments({ invoiceId }: { invoiceId: string }) {
  const attachments = useAttachments(invoiceId);
  const uploadAttachment = useUploadAttachment(invoiceId);
  const deleteAttachment = useDeleteAttachment(invoiceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceAttachment | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Attachments must be a PDF, PNG, JPEG, or WebP file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Attachments must be 10MB or smaller.");
      return;
    }
    uploadAttachment.mutate(file);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAttachment.mutateAsync(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4" />
          Attachments
        </CardTitle>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadAttachment.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {uploadAttachment.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Attach file
        </Button>
      </CardHeader>
      <CardContent>
        {attachments.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : attachments.data && attachments.data.length > 0 ? (
          <ul className="divide-y">
            {attachments.data.map((att) => (
              <li key={att.id} className="flex items-center gap-3 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{att.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(att.sizeBytes)}
                    {att.uploader && <> · {att.uploader.name}</>}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <a
                    href={attachmentDownloadUrl(invoiceId, att.id)}
                    title="Download"
                    rel="noreferrer"
                  >
                    <Download className="size-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Delete"
                  onClick={() => setDeleteTarget(att)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Attach receipts or supporting documents (PDF or image, up to 10MB).
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove attachment?"
        description={`This will permanently delete "${deleteTarget?.filename}".`}
        confirmLabel="Delete"
        loading={deleteAttachment.isPending}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
