"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarRange,
  Building2,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Search,
  Filter,
  Layers,
  MapPin,
  Users,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react";
import {
  activateTimetableAction,
  archiveTimetableAction,
  deleteTimetableAction,
} from "@/app/actions/timetable.actions";

interface ScheduleRecord {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  semesterLabel?: string | null;
  classType?: string | null;
  subjectCode?: string | null;
  subjectName?: string | null;
  facultyCode?: string | null;
  sourceRow?: number | null;
  sourceStartCol?: number | null;
  sourceEndCol?: number | null;
  isActive: boolean;
  resource: {
    id: string;
    code: string;
    roomNumber: string;
    name: string;
    type: string;
  };
  faculty?: {
    id: string;
    name: string;
    shortCode?: string | null;
  } | null;
  subject?: {
    id: string;
    code: string;
    name: string;
  } | null;
  program?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface TimetableDetailProps {
  timetable: {
    id: string;
    name: string;
    academicPeriod: string;
    sourceFileName: string;
    timetableStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
    recordsImported: number;
    recordsFailed: number;
    createdAt: Date | string;
    metadata?: any;
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
    schedules: ScheduleRecord[];
  };
}

export default function TimetableDetailView({ timetable }: TimetableDetailProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract unique filter options
  const uniqueRooms = Array.from(
    new Set(timetable.schedules.map((s) => s.resource.code))
  ).sort();

  const uniqueTypes = Array.from(
    new Set(timetable.schedules.map((s) => s.classType || "LECTURE"))
  ).sort();

  const filteredSchedules = timetable.schedules.filter((s) => {
    if (selectedDay !== "ALL" && s.dayOfWeek !== selectedDay) return false;
    if (selectedRoom !== "ALL" && s.resource.code !== selectedRoom) return false;
    if (selectedType !== "ALL" && (s.classType || "LECTURE") !== selectedType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSubject =
        s.subjectCode?.toLowerCase().includes(q) || s.subjectName?.toLowerCase().includes(q);
      const matchFaculty =
        s.faculty?.name.toLowerCase().includes(q) ||
        s.facultyCode?.toLowerCase().includes(q);
      const matchSem = s.semesterLabel?.toLowerCase().includes(q);
      const matchRoom = s.resource.code.toLowerCase().includes(q);
      if (!matchSubject && !matchFaculty && !matchSem && !matchRoom) return false;
    }

    return true;
  });

  const handleActivate = async () => {
    if (!confirm(`Activate "${timetable.name}"?\nThis will make all its schedules live and archive other active timetables for ${timetable.department.code}.`)) {
      return;
    }
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await activateTimetableAction(timetable.id);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to activate timetable");
    } finally {
      setIsBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive "${timetable.name}"?\nIts scheduled classes will no longer occupy resources.`)) {
      return;
    }
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await archiveTimetableAction(timetable.id);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to archive timetable");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${timetable.name}" and all ${timetable.schedules.length} schedule entries?\nThis action cannot be undone.`)) {
      return;
    }
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await deleteTimetableAction(timetable.id);
      if (!res.success) throw new Error(res.error);
      router.push("/admin/timetables");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete timetable");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/timetables"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Timetables
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {timetable.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {timetable.academicPeriod}
              </span>
              {timetable.timetableStatus === "ACTIVE" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE
                </span>
              )}
              {timetable.timetableStatus === "DRAFT" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/50 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> DRAFT
                </span>
              )}
              {timetable.timetableStatus === "ARCHIVED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 flex items-center gap-1">
                  <Archive className="h-3.5 w-3.5" /> ARCHIVED
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {timetable.department.name} ({timetable.department.code})
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Source: {timetable.sourceFileName}
              </span>
              <span>
                Imported by {timetable.importedBy.name} on{" "}
                {format(new Date(timetable.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {timetable.timetableStatus !== "ACTIVE" && (
              <button
                disabled={isBusy}
                onClick={handleActivate}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Activate Timetable
              </button>
            )}
            {timetable.timetableStatus === "ACTIVE" && (
              <button
                disabled={isBusy}
                onClick={handleArchive}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Archive className="h-4 w-4" /> Archive Timetable
              </button>
            )}
            <button
              disabled={isBusy}
              onClick={handleDelete}
              className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Delete Timetable"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-[11px] font-semibold uppercase text-zinc-400">Total Classes</div>
            <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {timetable.schedules.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-zinc-400">Unique Rooms</div>
            <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {uniqueRooms.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-zinc-400">Off-Grid / Unresolved</div>
            <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {timetable.recordsFailed}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-zinc-400">Live Availability</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {timetable.timetableStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, teacher, room, semester..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Select Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="ALL">All Days</option>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
            </select>

            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="ALL">All Rooms</option>
              {uniqueRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Showing {filteredSchedules.length} of {timetable.schedules.length} schedule entries.
        </div>
      </div>

      {/* Schedule Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Time Interval</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Class Type</th>
                <th className="py-3 px-4 text-right">Spreadsheet Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredSchedules.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                >
                  <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                    {s.dayOfWeek}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {s.startTime} – {s.endTime}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {s.resource.code}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {s.resource.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.subjectCode || s.subject?.code}
                    </span>
                    {(s.subjectName || s.subject?.name) && (
                      <span className="text-zinc-400 block text-[11px]">
                        {s.subjectName || s.subject?.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                    {s.faculty?.name || s.facultyCode || "—"}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                    {s.semesterLabel || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.classType === "LAB"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : s.classType === "REMEDIAL"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          : s.classType === "TUTORIAL"
                          ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {s.classType || "LECTURE"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 font-mono text-[11px]">
                    Row {s.sourceRow || "—"} · Cols {s.sourceStartCol ?? "—"}-{s.sourceEndCol ?? "—"}
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
