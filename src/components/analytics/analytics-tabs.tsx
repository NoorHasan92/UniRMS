"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, LayoutList, Search, Filter, ArrowUpRight } from "lucide-react";
import type { WeeklyUtilization, ResourceDayStatus } from "@/types";
import { BLOCK_LABELS } from "@/lib/constants";
import StatusBadge from "@/components/ui/status-badge";
import WeeklyUtilizationMatrix from "./weekly-utilization-matrix";

interface AnalyticsTabsProps {
  utilizationData: WeeklyUtilization[];
  departments: { id: string; code: string; name: string }[];
  allStatuses: ResourceDayStatus[];
  dateDisplay: string;
  dayName: string;
}

export default function AnalyticsTabs({
  utilizationData,
  departments,
  allStatuses,
  dateDisplay,
  dayName,
}: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "overview">("analytics");

  // Overview tab filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredStatuses = useMemo(() => {
    return allStatuses.filter((r) => {
      const matchesSearch =
        r.resourceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept =
        departmentFilter === "ALL" || (r.departmentCode ?? "Common") === departmentFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [allStatuses, searchTerm, departmentFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "analytics"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Weekly Analytics</span>
            {activeTab === "analytics" && (
              <motion.div
                layoutId="active-analytics-tab"
                className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
            }`}
          >
            <LayoutList className="h-4 w-4" />
            <span>Resource Overview</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              {allStatuses.length}
            </span>
            {activeTab === "overview" && (
              <motion.div
                layoutId="active-analytics-tab"
                className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        <div className="text-xs text-zinc-400 hidden sm:block">
          {activeTab === "analytics" ? "Aggregated Monday - Friday" : `${dateDisplay} • ${dayName}`}
        </div>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === "analytics" ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]"
          >
            <WeeklyUtilizationMatrix data={utilizationData} departments={departments} />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
          >
            {/* Table Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Today&apos;s Resource Overview
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Showing {filteredStatuses.length} of {allStatuses.length} resources
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code}
                    </option>
                  ))}
                  <option value="Common">Common</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FULLY_UNUSED">Fully Unused</option>
                  <option value="PARTIALLY_USED">Partially Used</option>
                  <option value="FULLY_OCCUPIED">Fully Occupied</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-3.5">Resource</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Capacity</th>
                    <th className="px-6 py-3.5">Utilization</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredStatuses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-zinc-500">
                        No resources match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStatuses.map((r) => (
                      <tr
                        key={r.resourceId}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/resources/${r.resourceId}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <span>{r.resourceCode}</span>
                            <ArrowUpRight className="h-3 w-3 opacity-60" />
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {BLOCK_LABELS[r.block]} • Floor {r.floor}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {r.resourceType}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {r.departmentCode ?? "—"}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {r.capacity}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
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
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              {r.utilizationPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-3.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          {r.scheduledHours}h
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
