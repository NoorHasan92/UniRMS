import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import SubjectsList from "@/components/admin/subjects-list";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  await requireAdmin();

  const [subjects, departments] = await Promise.all([
    prisma.subject.findMany({
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
      orderBy: { code: "asc" },
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Subjects & Courses</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Academic subjects and course codes taught across departments.
          </p>
        </div>
      </div>

      <SubjectsList initialSubjects={subjects} departments={departments} />
    </div>
  );
}
