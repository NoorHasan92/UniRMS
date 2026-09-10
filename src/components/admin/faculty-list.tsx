"use client";

import { useState, useMemo } from "react";
import { Search, Building2, Calendar, Users, Mail } from "lucide-react";

interface FacultyItem {
  id: string;
  name: string;
  shortCode: string | null;
  email: string | null;
  isActive: boolean;
  department: {
    code: string;
    name: string;
  } | null;
  _count: {
    schedules: number;
  };
}

interface FacultyListProps {
  initialFaculty: FacultyItem[];
  departments: { id: string; code: string; name: string }[];
}

export default function FacultyList({ initialFaculty, departments }: FacultyListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredFaculty = useMemo(() => {
    return initialFaculty.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.shortCode && f.shortCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept =
        departmentFilter === "ALL" || (f.department?.code || "NONE") === departmentFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && f.isActive) ||
        (statusFilter === "INACTIVE" && !f.isActive);
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [initialFaculty, searchTerm, departmentFilter, statusFilter]);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search faculty name, code, email..."
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
          Showing {filteredFaculty.length} of {initialFaculty.length} Faculty
        </span>
      </div>

      {filteredFaculty.length === 0 ? (
        <div className="p-12 text-center text-sm text-zinc-500">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-zinc-400" />
          No faculty members match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Faculty Name</th>
                <th className="px-6 py-3.5">Short Code</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Schedules</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredFaculty.map((f) => (
                <tr
                  key={f.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {f.name}
                  </td>
                  <td className="px-6 py-4">
                    {f.shortCode ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {f.shortCode}
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-mono text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {f.department ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <Building2 className="h-3 w-3 text-zinc-400" />
                        {f.department.code}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {f.email ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                        <Mail className="h-3.5 w-3.5 text-zinc-400" />
                        {f.email}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      {f._count.schedules} classes
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        f.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {f.isActive ? "Active" : "Inactive"}
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
