"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { processTimetableImport } from "@/app/actions/timetable.actions";

export default function TimetableImportView({ initialImports }: { initialImports: any[] }) {
  const [imports, setImports] = useState(initialImports);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [result, setResult] = useState<{
    success: boolean;
    recordsImported?: number;
    recordsFailed?: number;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.name.endsWith(".csv")) {
        setFile(dropped);
        setCurrentStep(2);
      } else {
        alert("Please upload a CSV file (.csv)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setCurrentStep(2);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setCurrentStep(1);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSampleTemplate = () => {
    const headers =
      "dayOfWeek,startTime,endTime,resourceCode,subjectCode,facultyCode,programCode,semester,section";
    const sample1 = "MONDAY,09:00,10:30,CR-101,CS101,FAC-1,BTECH-CSE,1,A";
    const sample2 = "MONDAY,10:30,12:00,LB-501,CS102,FAC-2,BTECH-CSE,1,A";
    const sample3 = "TUESDAY,14:00,15:30,CR-102,CS201,FAC-3,BTECH-CSE,3,B";
    const csvContent = "data:text/csv;charset=utf-8," + [headers, sample1, sample2, sample3].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "timetable_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setCurrentStep(3);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        // Skip header
        const dataRows = lines.slice(1);

        const parsedData = dataRows.map((row) => {
          const cols = row.split(",").map((c) => c.trim());
          return {
            dayOfWeek: cols[0],
            startTime: cols[1],
            endTime: cols[2],
            resourceCode: cols[3],
            subjectCode: cols[4] || null,
            facultyCode: cols[5] || null,
            programCode: cols[6] || null,
            semester: cols[7] || null,
            section: cols[8] || null,
          };
        });

        const res = await processTimetableImport(parsedData, file.name);
        setResult(res);

        if (res.success) {
          setImports([
            {
              id: "temp-" + Date.now(),
              filename: file.name,
              status:
                res.recordsFailed === 0
                  ? "COMPLETED"
                  : res.recordsImported === 0
                  ? "FAILED"
                  : "COMPLETED",
              recordsImported: res.recordsImported,
              recordsFailed: res.recordsFailed,
              createdAt: new Date(),
              importedBy: { name: "You" },
            },
            ...imports,
          ]);
        }

        setFile(null);
        setCurrentStep(1);
        setLoading(false);
      };

      reader.onerror = () => {
        setResult({ success: false, errors: ["Failed to read file on disk."] });
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (err: any) {
      setResult({ success: false, errors: [err.message] });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Section Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6 sm:p-8">
        {/* Step Indicator Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto mb-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  currentStep >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                1
              </span>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 1 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                }`}
              >
                Select CSV
              </span>
            </div>

            <div className="h-0.5 w-12 sm:w-20 bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  currentStep >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                2
              </span>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 2 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                }`}
              >
                Review File
              </span>
            </div>

            <div className="h-0.5 w-12 sm:w-20 bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  currentStep >= 3
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                3
              </span>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 3 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                }`}
              >
                Import
              </span>
            </div>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div className="max-w-2xl mx-auto space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 scale-[1.01]"
                : file
                ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-800"
                : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20 hover:border-zinc-400"
            }`}
          >
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 mb-3 shadow-xs">
              <Upload className="h-7 w-7" />
            </div>

            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Drag & drop your timetable CSV here
            </h4>
            <p className="text-xs text-zinc-500 mb-4 max-w-sm">
              Supports standard UniRMS CSV files with course codes, faculty, rooms, and time slots.
            </p>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Browse File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                Template
              </button>
            </div>

            {/* Selected File Card */}
            {file && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-3.5 bg-white dark:bg-zinc-800 rounded-xl flex items-center gap-3 w-full border border-emerald-200 dark:border-emerald-800 shadow-xs"
              >
                <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-left truncate">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                    {file.name}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • CSV ready for import
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-400">
              Format: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">day,start,end,room,subject,faculty,program,sem,sec</code>
            </div>

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Start Import</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Progress Bar during loading */}
          {loading && (
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="bg-blue-600 h-1.5 rounded-full"
              />
            </div>
          )}

          {/* Result Alert */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl border ${
                  result.success && result.recordsFailed === 0
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                  {result.success && result.recordsFailed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <span>
                    {result.success && result.recordsFailed === 0
                      ? "Import Completed Successfully"
                      : "Import Completed with Issues"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                  <div className="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5">
                    <span className="text-zinc-500 block">Records Imported</span>
                    <span className="text-lg font-bold text-emerald-600 font-mono">
                      {result.recordsImported || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5">
                    <span className="text-zinc-500 block">Records Failed</span>
                    <span className="text-lg font-bold text-red-500 font-mono">
                      {result.recordsFailed || 0}
                    </span>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-red-300 mb-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Errors / Conflicts detected:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-0.5 max-h-32 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Past Imports Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Past Imports</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Audit log of batch timetable imports</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {imports.length} Batch{imports.length !== 1 ? "es" : ""}
          </span>
        </div>

        {imports.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            No timetable imports have been performed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3.5">File Name</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Success / Fail</th>
                  <th className="px-6 py-3.5">Imported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {imports.map((im) => (
                  <tr
                    key={im.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="font-mono text-xs">{im.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-500">
                      {format(new Date(im.createdAt), "MMM d, yyyy • HH:mm")}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          im.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : im.status === "FAILED"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        }`}
                      >
                        {im.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <span className="text-emerald-600 font-bold">{im.recordsImported ?? 0}</span>
                      <span className="text-zinc-400 mx-1">/</span>
                      <span className="text-red-500 font-bold">{im.recordsFailed ?? 0}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {im.importedBy?.name ?? "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
