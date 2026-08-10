"use client";

import { FileUp, Loader2 } from "lucide-react";
import { Fragment, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePreviewInvoiceXmlFile, usePreviewInvoiceXmlText } from "@/hooks/use-invoice-xml-import";
import type { XmlInvoiceImportResult } from "@/lib/api/invoiceXmlImport";

// Chapter 18 — XXE lab (INTENTIONAL, training only). Lets an owner/accountant
// preview an invoice from an uploaded or pasted e-invoice XML file. The
// preview is rendered as plain text (React-escaped), never dangerouslySet —
// this chapter is about the server-side parse, not a client-side XSS sink.
export function ImportXmlDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<XmlInvoiceImportResult | null>(null);

  const previewFile = usePreviewInvoiceXmlFile();
  const previewText = usePreviewInvoiceXmlText();
  const pending = previewFile.isPending || previewText.isPending;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = await previewFile.mutateAsync(file);
    setResult(data);
  }

  async function handlePreviewText() {
    if (!pasted.trim()) return;
    const data = await previewText.mutateAsync(pasted);
    setResult(data);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setResult(null);
      setPasted("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import invoice from XML</DialogTitle>
          <DialogDescription>
            Upload or paste a UBL-style e-invoice XML document. Kontora parses it server-side and
            shows a preview of the fields it found — nothing is saved yet.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload file</TabsTrigger>
            <TabsTrigger value="paste">Paste XML</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xml,application/xml,text/xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {previewFile.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              Choose an .xml file
            </Button>
          </TabsContent>
          <TabsContent value="paste" className="space-y-3">
            <Label htmlFor="pasted-xml">XML source</Label>
            <Textarea
              id="pasted-xml"
              rows={8}
              className="font-mono text-xs"
              placeholder="<Invoice>...</Invoice>"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending || !pasted.trim()}
              onClick={handlePreviewText}
            >
              {previewText.isPending && <Loader2 className="size-4 animate-spin" />}
              Preview
            </Button>
          </TabsContent>
        </Tabs>

        {result && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            {result.parseError ? (
              <>
                <p className="font-medium text-destructive">Couldn&apos;t parse this document</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                  {result.parseError}
                </pre>
              </>
            ) : (
              <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                {([
                  ["Invoice #", result.invoice?.number],
                  ["Client", result.invoice?.clientName],
                  ["Issue date", result.invoice?.issueDate],
                  ["Due date", result.invoice?.dueDate],
                  ["Currency", result.invoice?.currency],
                  ["Total", result.invoice?.total],
                ] as const).map(([label, value]) => (
                  <Fragment key={label}>
                    <dt className="col-span-1 text-muted-foreground">{label}</dt>
                    <dd className="col-span-2 break-words">{value || "—"}</dd>
                  </Fragment>
                ))}
                <dt className="col-span-1 text-muted-foreground">Notes</dt>
                <dd className="col-span-2 max-h-40 overflow-auto break-words whitespace-pre-wrap font-mono text-xs">
                  {result.invoice?.notes || "—"}
                </dd>
              </dl>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
