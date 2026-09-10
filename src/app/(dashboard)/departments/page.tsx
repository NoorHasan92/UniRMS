import { getDepartments } from "@/app/actions/department.actions";
import DepartmentList from "@/components/departments/department-list";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await requireAuth();
  const departments = await getDepartments();
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Departments</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage university academic departments and their details.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <DepartmentList initialDepartments={departments} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
