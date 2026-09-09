import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { Users, Building2, Mail, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminFacultyPage() {
  await requireAdmin();

  const facultyList = await prisma.faculty.findMany({
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
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Faculty Members</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Professors, lecturers, and teaching staff assigned to timetables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {facultyList.length} Member{facultyList.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Short Code</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Schedules</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {facultyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                    No faculty members found.
                  </td>
                </tr>
              ) : (
                facultyList.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {f.name}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      {f.shortCode || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {f.department ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <Building2 className="h-3 w-3 text-zinc-400" />
                          {f.department.code}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {f.email ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          {f.email}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        {f._count.schedules} classes
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          f.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {f.isActive ? "Active" : "Inactive"}
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
