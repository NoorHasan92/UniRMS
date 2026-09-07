import { getWeeklyUtilization } from "@/lib/services/availability.service";
import { getDepartments } from "@/app/actions/department.actions";
import { requireAuth } from "@/lib/auth-utils";
import WeeklyUtilizationMatrix from "@/components/analytics/weekly-utilization-matrix";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAuth();

  const [utilizationData, departments] = await Promise.all([
    getWeeklyUtilization(),
    getDepartments(),
  ]);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Analytics & Utilization</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Weekly resource utilization matrix and deep-dive insights.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <WeeklyUtilizationMatrix data={utilizationData} departments={departments} />
      </div>
    </div>
  );
}
