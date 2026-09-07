import { getDepartments } from "@/app/actions/department.actions";
import { getResources } from "@/app/actions/resource.actions";
import ScheduleView from "@/components/schedules/schedule-view";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await requireAuth();
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const [departments, resources, programs, subjects, faculties, schedules] = await Promise.all([
    getDepartments(),
    getResources(),
    prisma.program.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.faculty.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.schedule.findMany({
      where: { isActive: true },
      include: {
        resource: true,
        department: true,
        program: true,
        subject: true,
        faculty: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    }),
  ]);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Timetable & Schedules</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage academic schedules. This is the source of truth for resource availability.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[500px]">
        <ScheduleView
          initialSchedules={schedules}
          departments={departments}
          resources={resources}
          programs={programs}
          subjects={subjects}
          faculties={faculties}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
