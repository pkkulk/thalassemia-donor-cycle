"use client";

import dynamic from "next/dynamic";

const DonorPatientDirectory = dynamic(
  () => import("@/components/DonorPatientDirectory_new"),
  { ssr: false }
);

export default function DirectoryPage() {
  return <DonorPatientDirectory />;
}
