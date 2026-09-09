import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { GraduationCap, Building2, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requireAdmin();

  const programs = await prisma.program.findMany({
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
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Academic Programs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Degree programs and academic courses registered in UniRMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {programs.length} Program{programs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Programs Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Program Name</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Schedules</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                    <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                    No programs registered yet.
                  </td>
                </tr>
              ) : (
                programs.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {p.code}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {p.name}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {p.department ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <Building2 className="h-3 w-3 text-zinc-400" />
                          {p.department.code}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {p.durationYears} Years
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        {p._count.schedules} slots
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
