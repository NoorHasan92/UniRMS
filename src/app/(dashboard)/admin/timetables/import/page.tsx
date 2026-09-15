import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import TimetableImportWizard from "@/components/admin/timetable-import-wizard";

export const metadata: Metadata = {
  title: "Import Timetable | UniRMS Admin",
  description: "Upload and inspect university Excel routines with merged cells and dynamic sheet detection.",
};

export default async function AdminTimetableImportPage() {
  await requireAdmin();

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <TimetableImportWizard departments={departments} />
    </div>
  );
}
