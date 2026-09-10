import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import FacultyList from "@/components/admin/faculty-list";

export const dynamic = "force-dynamic";

export default async function AdminFacultyPage() {
  await requireAdmin();

  const [facultyList, departments] = await Promise.all([
    prisma.faculty.findMany({
      include: {
        department: {
          select: {
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            schedules: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Faculty Members</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Professors, lecturers, and teaching staff assigned to timetables.
          </p>
        </div>
      </div>

      <FacultyList initialFaculty={facultyList} departments={departments} />
    </div>
  );
}
