"use client";

import { Suspense } from "react";
import DonorPatientDirectory from "@/components/DonorPatientDirectory_new";
import AdminShell from "@/components/AdminShell";
import { useI18n } from "@/lib/i18n";

export default function DirectoryPage() {
  const { t } = useI18n();
  return (
    <AdminShell
      active="directory"
      title={t("directory.title")}
      subtitle={t("directory.subtitle")}
    >
      <Suspense fallback={null}>
        <DonorPatientDirectory />
      </Suspense>
    </AdminShell>
  );
}
