"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { PageHeader } from "@/components/shared/page-header";
import { useMe } from "@/hooks/use-auth";
import { useCompany } from "@/hooks/use-company";

export default function CompanySettingsPage() {
  const { data: me } = useMe();
  const company = useCompany();
  const readOnly = me?.role !== "OWNER";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Company settings" description="Your workspace's profile and branding." />

      {company.isPending || !company.data ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <LogoUploader company={company.data} readOnly={readOnly} />
          <CompanyProfileForm company={company.data} readOnly={readOnly} />
        </>
      )}
    </div>
  );
}
