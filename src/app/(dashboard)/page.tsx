import { getAllResourcesDayStatus, deriveDashboardSummary } from "@/lib/services/availability.service";
import { getDayOfWeek, formatDateDisplay } from "@/lib/time-utils";
import { BLOCK_LABELS, RESOURCE_STATUS, DAY_FULL_LABELS } from "@/lib/constants";
import StatusBadge from "@/components/ui/status-badge";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  const dayOfWeek = getDayOfWeek(today);
  const dateDisplay = formatDateDisplay(today);

  const allStatuses = await getAllResourcesDayStatus({ dayOfWeek });
  const summary = deriveDashboardSummary(allStatuses);

  // Sort: fully unused first, then by utilization
  const fullyUnused = allStatuses.filter((s) => s.status === RESOURCE_STATUS.FULLY_UNUSED);
  const underutilized = allStatuses
    .filter((s) => s.utilizationPercent > 0 && s.utilizationPercent < 40)
    .sort((a, b) => a.utilizationPercent - b.utilizationPercent);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {dateDisplay} • {DAY_FULL_LABELS[dayOfWeek] ?? dayOfWeek}
          </p>
        </div>
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <MessageSquareText className="h-4 w-4" />
          Ask AI Assistant
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Total Resources"
          value={summary.totalResources}
          icon={<Building2 className="h-5 w-5" />}
          color="blue"
        />
        <KPICard
          label="Fully Unused"
          value={summary.fullyUnused}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="emerald"
          highlight={summary.fullyUnused > 0}
        />
        <KPICard
          label="Partially Used"
          value={summary.partiallyUsed}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <KPICard
          label="Fully Occupied"
          value={summary.fullyOccupied}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <KPICard
          label="Avg Utilization"
          value={`${summary.averageUtilization}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          color="violet"
        />
        <KPICard
          label="Available"
          value={summary.availableForBooking}
          icon={<CalendarCheck className="h-5 w-5" />}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completely Unused Resources — MOST IMPORTANT */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                🟢 Completely Unused Today
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {fullyUnused.length} resource{fullyUnused.length !== 1 ? "s" : ""} with zero scheduled activity
              </p>
            </div>
            <Link href="/availability?status=FULLY_UNUSED" className="text-xs text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto">
            {fullyUnused.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-zinc-400">
                All resources are in use today
              </div>
            ) : (
              fullyUnused.map((r) => (
                <Link
                  key={r.resourceId}
                  href={`/resources/${r.resourceId}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {r.resourceCode}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {BLOCK_LABELS[r.block]} • Floor {r.floor} • {r.resourceType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.departmentCode && (
                      <span className="text-xs text-zinc-500">{r.departmentCode}</span>
                    )}
                    <span className="text-xs font-medium text-emerald-600">9hrs free</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Underutilized Resources */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                🟡 Underutilized Today
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Resources below 40% utilization
              </p>
            </div>
            <Link href="/analytics" className="text-xs text-blue-600 hover:underline">
              View analysis →
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto">
            {underutilized.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-zinc-400">
                No underutilized resources today
              </div>
            ) : (
              underutilized.map((r) => (
                <Link
                  key={r.resourceId}
                  href={`/resources/${r.resourceId}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {r.resourceCode}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {r.departmentCode ?? "—"} • {r.scheduledHours}hrs scheduled
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${r.utilizationPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-amber-600 w-10 text-right">
                      {r.utilizationPercent}%
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Block-wise & Department-wise Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Block-wise */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Block Utilization</h2>
          </div>
          <div className="p-6 space-y-4">
            {summary.byBlock.map((b) => (
              <div key={b.block}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {BLOCK_LABELS[b.block] ?? b.block}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {b.utilization}% • {b.unused} unused
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(b.utilization, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floor-wise */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Floor Utilization</h2>
          </div>
          <div className="p-6 space-y-3">
            {summary.byFloor.map((f) => (
              <div key={f.floor} className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-500 w-16">Floor {f.floor}</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(f.utilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-12 text-right">{f.utilization}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department-wise */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Department Utilization</h2>
          </div>
          <div className="p-6 space-y-3 max-h-64 overflow-y-auto">
            {summary.byDepartment
              .sort((a, b) => b.utilization - a.utilization)
              .map((d) => (
                <div key={d.department} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-20 truncate">
                    {d.department}
                  </span>
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(d.utilization, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-12 text-right">{d.utilization}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Today's Resource Overview Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Today&apos;s Resource Overview
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">All resources with current utilization status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <th className="px-6 py-3">Resource</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Capacity</th>
                <th className="px-6 py-3">Utilization</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {allStatuses.map((r) => (
                <tr
                  key={r.resourceId}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/resources/${r.resourceId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {r.resourceCode}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {BLOCK_LABELS[r.block]} • Floor {r.floor}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.resourceType}</td>
                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {r.departmentCode ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.capacity}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            r.utilizationPercent === 0
                              ? "bg-emerald-500"
                              : r.utilizationPercent < 40
                              ? "bg-amber-500"
                              : r.utilizationPercent < 80
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(r.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {r.utilizationPercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {r.scheduledHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", icon: "text-blue-600" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600" },
    red: { bg: "bg-red-50 dark:bg-red-950/30", icon: "text-red-600" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/30", icon: "text-violet-600" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-950/30", icon: "text-cyan-600" },
  };

  const c = colorClasses[color] ?? colorClasses.blue;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        highlight
          ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className={`inline-flex p-2 rounded-lg ${c.bg} ${c.icon} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
