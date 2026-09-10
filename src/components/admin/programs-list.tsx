"use client";

import { useState, useMemo } from "react";
import { Search, Building2, Calendar, GraduationCap } from "lucide-react";

interface ProgramItem {
  id: string;
  code: string;
  name: string;
  durationYears: number;
  isActive: boolean;
  department: {
    code: string;
    name: string;
  } | null;
  _count: {
    schedules: number;
  };
}

interface ProgramsListProps {
  initialPrograms: ProgramItem[];
  departments: { id: string; code: string; name: string }[];
}

export default function ProgramsList({ initialPrograms, departments }: ProgramsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const filteredPrograms = useMemo(() => {
    return initialPrograms.filter((p) => {
      const matchesSearch =
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept =
        departmentFilter === "ALL" || (p.department?.code || "NONE") === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [initialPrograms, searchTerm, departmentFilter]);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.code}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
          Showing {filteredPrograms.length} of {initialPrograms.length} Programs
        </span>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="p-12 text-center text-sm text-zinc-500">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30 text-zinc-400" />
          No academic programs match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Program Name</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Assigned Schedules</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredPrograms.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {p.department ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <Building2 className="h-3 w-3 text-zinc-400" />
                        {p.department.code}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {p.durationYears} Years
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      {p._count.schedules} slots
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
