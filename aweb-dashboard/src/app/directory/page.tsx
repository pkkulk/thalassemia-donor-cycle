"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import AdminShell from "@/components/AdminShell";
import { useI18n } from "@/lib/i18n";

const DonorPatientDirectory = dynamic(
  () => import("@/components/DonorPatientDirectory_new"),
  { ssr: false }
);

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
