"use client";

import React from "react";
import type { WeeklyUtilization } from "@/types";
import { RESOURCE_STATUS, DAY_LABELS } from "@/lib/constants";
import { Search } from "lucide-react";

export default function WeeklyUtilizationMatrix({
  data,
  departments,
}: {
  data: WeeklyUtilization[];
  departments: { id: string; code: string; name: string }[];
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("ALL");

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = 
        item.resourceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = 
        departmentFilter === "ALL" || 
        item.departmentCode === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [data, searchTerm, departmentFilter]);

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  const getStatusColor = (status: string, percent: number) => {
    if (status === RESOURCE_STATUS.FULLY_UNUSED) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    if (status === RESOURCE_STATUS.FULLY_OCCUPIED) return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    
    // Partially used coloring based on utilization percent
    if (percent < 30) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (percent < 60) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 sticky top-0">
            <tr>
              <th className="px-6 py-4 font-semibold whitespace-nowrap border-b border-zinc-200 dark:border-zinc-700">Resource</th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap border-b border-zinc-200 dark:border-zinc-700 text-center">Avg. Util</th>
              {days.map(day => (
                <th key={day} className="px-6 py-4 font-semibold text-center border-b border-zinc-200 dark:border-zinc-700">
                  {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No resources match the selected filters.
                </td>
              </tr>
            ) : (
              filteredData.map(item => (
                <tr key={item.resourceId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">{item.resourceCode}</div>
                    <div className="text-xs font-medium text-zinc-500">
                      {item.departmentCode || "Shared"} • Block {item.block}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.averageUtilization}%</span>
                  </td>
                  {days.map(day => {
                    const dayData = item.days[day];
                    if (!dayData) return <td key={day} className="px-4 py-4 text-center text-zinc-300 dark:text-zinc-700">-</td>;
                    
                    return (
                      <td key={day} className="px-3 py-4 text-center">
                        <div className={`mx-auto w-[72px] py-2 rounded-lg flex flex-col items-center justify-center text-xs font-bold tracking-wide shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5 ${getStatusColor(dayData.status, dayData.utilizationPercent)}`}>
                          <span>{dayData.utilizationPercent}%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
