"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { importClientsXml } from "@/lib/api/clients";
import { ApiError } from "@/lib/api/client";

// Uploads an XML file of clients. The file is parsed by export-worker's
// hardened (XXE-safe) parser via the API; this button just kicks it off and
// reports the outcome.
export function ImportXmlButton() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Please choose an .xml file.");
      return;
    }

    setImporting(true);
    try {
      const result = await importClientsXml(file);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      const problems = result.parseErrors.length + result.createErrors.length;
      if (result.createdCount > 0) {
        toast.success(
          `Imported ${result.createdCount} client${result.createdCount === 1 ? "" : "s"}` +
            (problems > 0 ? ` · ${problems} row(s) skipped` : ""),
        );
      } else {
        toast.error("No clients were imported. Check the file format.");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        Import XML
      </Button>
    </>
  );
}
