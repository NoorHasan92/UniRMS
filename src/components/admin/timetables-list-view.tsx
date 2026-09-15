"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarRange,
  Upload,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  Building2,
  User,
  AlertCircle,
} from "lucide-react";
import {
  activateTimetableAction,
  archiveTimetableAction,
  deleteTimetableAction,
} from "@/app/actions/timetable.actions";

interface TimetableItem {
  id: string;
  name: string;
  academicPeriod: string;
  sourceFileName: string;
  timetableStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
  recordsImported: number;
  recordsFailed: number;
  createdAt: Date | string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  importedBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    schedules: number;
  };
}

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

export default function TimetablesListView({
  timetables,
  departments,
}: {
  timetables: TimetableItem[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = timetables.filter((t) => {
    if (selectedDept !== "ALL" && t.department.id !== selectedDept) return false;
    if (selectedStatus !== "ALL" && t.timetableStatus !== selectedStatus) return false;
    return true;
  });

  const activeCount = timetables.filter((t) => t.timetableStatus === "ACTIVE").length;
  const draftCount = timetables.filter((t) => t.timetableStatus === "DRAFT").length;
  const archivedCount = timetables.filter((t) => t.timetableStatus === "ARCHIVED").length;
  const totalSchedules = timetables
    .filter((t) => t.timetableStatus === "ACTIVE")
    .reduce((acc, t) => acc + (t._count?.schedules || 0), 0);

  const handleActivate = async (id: string, name: string) => {
    if (!confirm(`Activate timetable "${name}"?\nThis will make its classes live and archive any currently active timetable for this department.`)) {
      return;
    }
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await activateTimetableAction(id);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to activate timetable");
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive timetable "${name}"?\nIts scheduled classes will be deactivated.`)) {
      return;
    }
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await archiveTimetableAction(id);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to archive timetable");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete timetable "${name}" and all its schedule records?\nThis cannot be undone.`)) {
      return;
    }
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await deleteTimetableAction(id);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete timetable");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            University Timetables
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Deterministic XLSX timetable management feeding campus classroom & lab availability.
          </p>
        </div>
        <Link
          href="/admin/timetables/import"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm hover:shadow"
        >
          <Upload className="h-4 w-4" />
          Import New Timetable
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{errorMsg}</div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Timetables
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {timetables.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active Versions
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {activeCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Drafts
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {draftCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Active Class Slots
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {totalSchedules}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "ALL", label: "All Statuses", count: timetables.length },
            { id: "ACTIVE", label: "Active", count: activeCount },
            { id: "DRAFT", label: "Draft", count: draftCount },
            { id: "ARCHIVED", label: "Archived", count: archivedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                selectedStatus === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetables Grid / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-zinc-400 dark:text-zinc-600" />
          <h3 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
            No timetables found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {selectedDept !== "ALL" || selectedStatus !== "ALL"
              ? "Try adjusting your department or status filter."
              : "Upload your department's multi-sheet XLSX timetable to get started."}
          </p>
          <div className="mt-5">
            <Link
              href="/admin/timetables/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              <Upload className="h-4 w-4" /> Import Timetable
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {t.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {t.academicPeriod}
                      </span>
                      {t.timetableStatus === "ACTIVE" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/50 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVE
                        </span>
                      )}
                      {t.timetableStatus === "DRAFT" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/50 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> DRAFT
                        </span>
                      )}
                      {t.timetableStatus === "ARCHIVED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 flex items-center gap-1">
                          <Archive className="h-3 w-3" /> ARCHIVED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {t.department.name} ({t.department.code})
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {t.importedBy.name}
                      </span>
                      <span>
                        Imported {format(new Date(t.createdAt), "MMM d, yyyy · h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status-dependent actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {t.timetableStatus !== "ACTIVE" && (
                    <button
                      disabled={busyId === t.id}
                      onClick={() => handleActivate(t.id, t.name)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                    >
                      Make Active
                    </button>
                  )}
                  {t.timetableStatus === "ACTIVE" && (
                    <button
                      disabled={busyId === t.id}
                      onClick={() => handleArchive(t.id, t.name)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                  <Link
                    href={`/admin/timetables/${t.id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition flex items-center gap-1"
                  >
                    Inspect <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    disabled={busyId === t.id}
                    onClick={() => handleDelete(t.id, t.name)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    title="Delete Timetable"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sub-bar stats */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span>
                    Source: <strong className="font-medium text-zinc-700 dark:text-zinc-300">{t.sourceFileName}</strong>
                  </span>
                  <span>
                    Imported Classes: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{t.recordsImported}</strong>
                  </span>
                  {t.recordsFailed > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      Off-grid/Unresolved: <strong>{t.recordsFailed}</strong>
                    </span>
                  )}
                </div>
                <div className="text-right text-zinc-400">
                  {t._count.schedules} active schedule slots
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
