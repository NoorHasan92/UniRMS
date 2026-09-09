import { getWeeklyUtilization, getAllResourcesDayStatus } from "@/lib/services/availability.service";
import { getDepartments } from "@/app/actions/department.actions";
import { requireAuth } from "@/lib/auth-utils";
import { getDayOfWeek, formatDateDisplay } from "@/lib/time-utils";
import { DAY_FULL_LABELS } from "@/lib/constants";
import AnalyticsTabs from "@/components/analytics/analytics-tabs";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAuth();

  const today = new Date();
  const dayOfWeek = getDayOfWeek(today);
  const dateDisplay = formatDateDisplay(today);
  const dayName = DAY_FULL_LABELS[dayOfWeek] ?? dayOfWeek;

  const [utilizationData, departments, allStatuses] = await Promise.all([
    getWeeklyUtilization(),
    getDepartments(),
    getAllResourcesDayStatus({ dayOfWeek }),
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

      <AnalyticsTabs
        utilizationData={utilizationData}
        departments={departments}
        allStatuses={allStatuses}
        dateDisplay={dateDisplay}
        dayName={dayName}
      />
    </div>
  );
}
