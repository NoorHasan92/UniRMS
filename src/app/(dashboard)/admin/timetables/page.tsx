import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import { getTimetables } from "@/lib/services/timetable.service";
import TimetablesListView from "@/components/admin/timetables-list-view";

export const metadata: Metadata = {
  title: "University Timetables | UniRMS Admin",
  description: "Manage university department timetables and academic routine imports.",
};

export default async function AdminTimetablesPage() {
  await requireAdmin();

  const [timetables, departments] = await Promise.all([
    getTimetables(),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <TimetablesListView
        timetables={timetables as any}
        departments={departments}
      />
    </div>
  );
}
