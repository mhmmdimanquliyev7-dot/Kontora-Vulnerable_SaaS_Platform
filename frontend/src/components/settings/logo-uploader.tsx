"use client";

import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUploadCompanyLogo } from "@/hooks/use-company";
import { apiUrl } from "@/lib/api/client";
import type { Company } from "@/lib/api/types";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export function LogoUploader({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const uploadLogo = useUploadCompanyLogo();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Logo must be 2MB or smaller.");
      return;
    }
    uploadLogo.mutate(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logo</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {company.logoUrl ? (
          <Image
            src={apiUrl(company.logoUrl)}
            alt={`${company.name} logo`}
            width={64}
            height={64}
            unoptimized
            className="size-16 rounded-lg border object-contain"
          />
        ) : (
          <Avatar className="size-16 rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary/10 text-lg text-primary">
              {company.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {!readOnly && (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadLogo.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadLogo.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload logo
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2MB.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
