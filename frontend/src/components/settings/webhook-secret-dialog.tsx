"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebhookSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secret: string | null;
}

// Shown exactly once, right after a webhook is created — the API never
// returns the full secret again after this (see webhook.service.ts's
// redact()), so this is the only chance to copy it.
export function WebhookSecretDialog({ open, onOpenChange, secret }: WebhookSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save your signing secret</DialogTitle>
          <DialogDescription>
            Use this to verify the <code>X-Kontora-Signature</code> header on incoming deliveries.
            For your security, we won&apos;t show it again after you close this dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 font-mono text-sm break-all">
          {secret}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy secret"}
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
