"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Clock,
  Layers,
  Users,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import { previewTimetableAction, commitTimetableAction } from "@/app/actions/timetable.actions";
import { TimetablePreviewResult } from "@/lib/services/timetable.service";

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

export default function TimetableImportWizard({
  departments,
}: {
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state: 1 = Upload, 2 = Preview/Validate, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments.find((d) => d.code === "CSE")?.id || departments[0]?.id || ""
  );
  const [timetableName, setTimetableName] = useState<string>("CSE Routine Jul-Dec 2026");
  const [academicPeriod, setAcademicPeriod] = useState<string>("Jul-Dec 2026");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Loading & Error states
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<TimetablePreviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 2 Review options
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");
  const [selectedPreviewDay, setSelectedPreviewDay] = useState<string>("ALL");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [committedId, setCommittedId] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setErrorMessage("Please select a Microsoft Excel workbook (.xlsx).");
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);

    // Auto-populate name if default
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    setTimetableName(cleanName);

    // Extract period if detected (e.g. Jul-Dec 2026)
    const periodMatch = file.name.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*_?(\d{4})/i);
    if (periodMatch) {
      setAcademicPeriod(`${periodMatch[1]}-${periodMatch[2]} ${periodMatch[3]}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select an XLSX file to upload.");
      return;
    }
    if (!selectedDeptId) {
      setErrorMessage("Please select an academic department.");
      return;
    }

    setIsPreviewing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("departmentId", selectedDeptId);

      const res = await previewTimetableAction(formData);
      if (!res.success || !res.preview) {
        throw new Error(res.error || "Failed to parse timetable file.");
      }

      setPreviewData(res.preview);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during preview.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || !selectedFile) return;

    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const res = await commitTimetableAction({
        departmentId: selectedDeptId,
        name: timetableName,
        academicPeriod,
        sourceFileName: selectedFile.name,
        timetableStatus: targetStatus,
        resolvedEntries: previewData.resolutionSummary.resolvedEntries,
        metadata: {
          sheetsParsed: previewData.sheetsParsed,
          unresolvedCount: previewData.resolutionSummary.unresolvedResourceCount,
          noResourceCount: previewData.resolutionSummary.noResourceCount,
          conflictsCount: previewData.resolutionSummary.conflicts.length,
          teachersMappedCount: Object.keys(previewData.teachersMapped).length,
        },
      });

      if (!res.success || !res.timetableId) {
        throw new Error(res.error || "Failed to commit timetable.");
      }

      setCommittedId(res.timetableId);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during commit.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Steps Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Timetable Import Wizard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Parse multi-sheet Excel timetables with merged cells to drive campus resource availability.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <div
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              step >= 1
                ? "bg-blue-600 text-white font-semibold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            <span>1</span> Upload
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
          <div
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              step >= 2
                ? "bg-blue-600 text-white font-semibold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            <span>2</span> Preview & Audit
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
          <div
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              step === 3
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            <span>3</span> Done
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300 font-medium">
            {errorMessage}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD & CONFIGURATION                                            */}
      {/* ========================================================================= */}
      {step === 1 && (
        <form onSubmit={handlePreview} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form inputs */}
            <div className="md:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Import Metadata
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Timetable Name *
                  </label>
                  <input
                    type="text"
                    value={timetableName}
                    onChange={(e) => setTimetableName(e.target.value)}
                    placeholder="e.g. CSE Routine Jul-Dec 2026"
                    className="w-full text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Academic Period *
                  </label>
                  <input
                    type="text"
                    value={academicPeriod}
                    onChange={(e) => setAcademicPeriod(e.target.value)}
                    placeholder="e.g. Jul-Dec 2026"
                    className="w-full text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Supported Features Box */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-4 w-4" /> Deterministic Features
                </div>
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                  <li>Multi-sheet routines (Mon-Thu, Friday, etc.)</li>
                  <li>Merged cells spanning 2-3 hours mapped accurately</li>
                  <li>Teachers sheet mapping to full faculty names</li>
                  <li>Alt-room indicators like (608) and (Lab -606)</li>
                </ul>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="md:col-span-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`h-full min-h-[320px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10"
                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Ready to inspect
                      </div>
                    </div>
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      File Selected
                    </span>
                    <p className="text-xs text-zinc-400 mt-2">
                      Click or drag a different file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                        Drop your university timetable workbook here
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Supports standard department routine files (.xlsx)
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/admin/timetables"
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>

            <button
              type="submit"
              disabled={!selectedFile || isPreviewing}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isPreviewing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Inspecting Workbook...
                </>
              ) : (
                <>
                  Inspect & Preview Timetable <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PREVIEW & AUDIT REPORT                                            */}
      {/* ========================================================================= */}
      {step === 2 && previewData && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="text-xs font-semibold uppercase text-zinc-500">Total Detected</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {previewData.resolutionSummary.totalEntries}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Academic slots</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
              <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolved Rooms
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {previewData.resolutionSummary.resolvedCount}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Ready for allocation
              </div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm ${
              previewData.resolutionSummary.unresolvedResourceCount > 0
                ? "bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50"
                : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            }`}>
              <div className={`text-xs font-semibold uppercase ${
                previewData.resolutionSummary.unresolvedResourceCount > 0
                  ? "text-red-700 dark:text-red-400"
                  : "text-zinc-500"
              }`}>
                Unresolved Rooms
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                previewData.resolutionSummary.unresolvedResourceCount > 0
                  ? "text-red-700 dark:text-red-300"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}>
                {previewData.resolutionSummary.unresolvedResourceCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {previewData.resolutionSummary.unresolvedRooms.length} unregistered rooms
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="text-xs font-semibold uppercase text-zinc-500">Off-Grid / External</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {previewData.resolutionSummary.noResourceCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">No room assigned</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
              <div className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Teachers Mapped
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {Object.keys(previewData.teachersMapped).length}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                From reference sheets
              </div>
            </div>
          </div>

          {/* Unresolved Rooms Alert if any */}
          {previewData.resolutionSummary.unresolvedRooms.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-red-800 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Unresolved Room Codes Detected
              </div>
              <p className="text-xs text-red-700 dark:text-red-400">
                The following rooms mentioned in the timetable were not found in UniRMS:{" "}
                <strong>{previewData.resolutionSummary.unresolvedRooms.join(", ")}</strong>.
                Entries referencing these rooms will be flagged.
              </p>
            </div>
          )}

          {/* Internal Overlaps / Conflicts Alert if any */}
          {previewData.resolutionSummary.conflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Room Overlaps Detected ({previewData.resolutionSummary.conflicts.length})
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Some classes overlap in the same room (e.g. parallel batch laboratory sessions). These are preserved as parsed and listed below:
              </p>
              <div className="max-h-36 overflow-y-auto text-xs space-y-1 text-amber-900 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 p-2.5 rounded-xl">
                {previewData.resolutionSummary.conflicts.slice(0, 10).map((c, i) => (
                  <div key={i}>• {c.message}</div>
                ))}
                {previewData.resolutionSummary.conflicts.length > 10 && (
                  <div className="font-semibold text-amber-800 dark:text-amber-200">
                    ... and {previewData.resolutionSummary.conflicts.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Schedule Matrix by Day */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Resolved Schedule Preview
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Inspect the physical timetable entries and computed time spans.
                </p>
              </div>

              {/* Day filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {["ALL", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedPreviewDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      selectedPreviewDay === day
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {day === "ALL" ? "All Days" : day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Faculty</th>
                    <th className="py-2.5 px-3">Semester</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Merge Span</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {previewData.resolutionSummary.resolvedEntries
                    .filter(
                      (e) =>
                        selectedPreviewDay === "ALL" || e.entry.dayOfWeek === selectedPreviewDay
                    )
                    .slice(0, 40)
                    .map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.entry.dayOfWeek.slice(0, 3)}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {item.entry.startTime} – {item.entry.endTime}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {item.resourceCode || item.entry.roomCode}
                          </span>
                          {item.entry.altRoomCode && (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              alt: {item.entry.altRoomCode}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                          {item.entry.subjectCode}
                          {item.entry.subjectName && (
                            <span className="text-zinc-400 block text-[11px]">
                              {item.entry.subjectName}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {item.facultyName || item.entry.facultyCodes.join(", ") || "—"}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {item.entry.semesterLabel}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.entry.classType === "LAB"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                : item.entry.classType === "REMEDIAL"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : item.entry.classType === "TUTORIAL"
                                ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {item.entry.classType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-400 font-mono">
                          {item.entry.sourceEndCol - item.entry.sourceStartCol + 1 > 1 ? (
                            <span className="text-emerald-600 font-semibold">
                              {item.entry.sourceEndCol - item.entry.sourceStartCol + 1} cols merged
                            </span>
                          ) : (
                            "1 col"
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-zinc-400 text-center">
              Showing first 40 of {previewData.resolutionSummary.resolvedCount} resolved entries.
            </div>
          </div>

          {/* Commit Options & Final Confirmation */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Publishing Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  targetStatus === "ACTIVE"
                    ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="ACTIVE"
                  checked={targetStatus === "ACTIVE"}
                  onChange={() => setTargetStatus("ACTIVE")}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Activate Immediately (Recommended)
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Directly updates campus classroom/lab availability. Automatically archives any previous active timetable for this department.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  targetStatus === "DRAFT"
                    ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="DRAFT"
                  checked={targetStatus === "DRAFT"}
                  onChange={() => setTargetStatus("DRAFT")}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Save as Draft
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Store for administrative review without affecting live resource bookings and availability. Can be activated at any time.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setStep(1)}
              disabled={isCommitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Re-upload / Back
            </button>

            <button
              onClick={handleCommit}
              disabled={isCommitting || previewData.resolutionSummary.resolvedCount === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isCommitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Committing Transaction...
                </>
              ) : (
                <>
                  Commit {previewData.resolutionSummary.resolvedCount} Classes to UniRMS
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SUCCESS STATE                                                     */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Timetable Successfully Imported!
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              {timetableName} has been committed.{" "}
              {targetStatus === "ACTIVE"
                ? "Its classes are now LIVE and feeding real-time room availability across the university."
                : "It is saved as DRAFT and ready for administrative review."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            {committedId && (
              <Link
                href={`/admin/timetables/${committedId}`}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm"
              >
                Inspect Timetable
              </Link>
            )}
            <Link
              href="/admin/timetables"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition"
            >
              Return to Timetables
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
