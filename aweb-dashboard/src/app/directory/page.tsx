import { Suspense } from "react";
import DonorPatientDirectory from "@/components/DonorPatientDirectory_new";
import AdminShell from "@/components/AdminShell";

export default function DirectoryPage() {
  return (
    <AdminShell
      active="directory"
      title="Directory"
      subtitle="Manage donors, patients, appointments, and mappings"
    >
      <Suspense fallback={null}>
        <DonorPatientDirectory />
      </Suspense>
    </AdminShell>
  );
}
