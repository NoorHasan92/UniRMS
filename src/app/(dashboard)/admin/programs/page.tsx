import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import ProgramsList from "@/components/admin/programs-list";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requireAdmin();

  const [programs, departments] = await Promise.all([
    prisma.program.findMany({
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Academic Programs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Degree programs and academic courses registered in UniRMS.
          </p>
        </div>
      </div>

      <ProgramsList initialPrograms={programs} departments={departments} />
    </div>
  );
}
