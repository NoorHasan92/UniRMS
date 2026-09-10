"use client";

import { useState, useRef, useMemo } from "react";
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
  ArrowLeft,
  ShieldAlert,
  SlidersHorizontal,
  Table as TableIcon,
  RotateCcw,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { processTimetableImport } from "@/app/actions/timetable.actions";

interface TargetField {
  key: string;
  label: string;
  required: boolean;
  description: string;
  autoMatchKeywords: string[];
}

const TARGET_FIELDS: TargetField[] = [
  {
    key: "dayOfWeek",
    label: "Day of Week",
    required: true,
    description: "e.g. Monday, MONDAY, Mon",
    autoMatchKeywords: ["day", "weekday", "dayofweek", "day_of_week"],
  },
  {
    key: "startTime",
    label: "Start Time",
    required: true,
    description: "e.g. 09:00, 9:00 AM",
    autoMatchKeywords: ["start", "start_time", "starttime", "from", "period_start", "time_from", "begin"],
  },
  {
    key: "endTime",
    label: "End Time",
    required: true,
    description: "e.g. 10:30, 10:30 AM",
    autoMatchKeywords: ["end", "end_time", "endtime", "to", "period_end", "time_to", "finish"],
  },
  {
    key: "resourceCode",
    label: "Room / Resource Code",
    required: true,
    description: "e.g. CR-101, LB-501",
    autoMatchKeywords: ["room", "resource", "resourcecode", "room_no", "roomno", "hall", "lab", "classroom", "venue"],
  },
  {
    key: "subjectCode",
    label: "Subject Code / Name",
    required: false,
    description: "e.g. CS101, Data Structures",
    autoMatchKeywords: ["subject", "subjectcode", "subject_code", "course", "course_code", "sub", "paper"],
  },
  {
    key: "facultyCode",
    label: "Faculty / Teacher",
    required: false,
    description: "e.g. FAC-1, Dr. Rajesh",
    autoMatchKeywords: ["faculty", "facultycode", "faculty_code", "teacher", "prof", "professor", "instructor", "staff"],
  },
  {
    key: "programCode",
    label: "Program / Branch Code",
    required: false,
    description: "e.g. BTECH-CSE",
    autoMatchKeywords: ["program", "programcode", "program_code", "branch", "dept", "department", "degree"],
  },
  {
    key: "semester",
    label: "Semester / Year",
    required: false,
    description: "e.g. 1, 3, 5",
    autoMatchKeywords: ["semester", "sem", "year"],
  },
  {
    key: "section",
    label: "Section",
    required: false,
    description: "e.g. A, B",
    autoMatchKeywords: ["section", "sec", "batch", "div", "division"],
  },
];

export default function TimetableImportView({ initialImports }: { initialImports: any[] }) {
  const [imports, setImports] = useState(initialImports);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // CSV parsing & mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Past imports search
  const [historySearch, setHistorySearch] = useState("");

  const [result, setResult] = useState<{
    success: boolean;
    recordsImported?: number;
    recordsFailed?: number;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-match user's CSV headers to target fields
  const detectMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};

    TARGET_FIELDS.forEach((target) => {
      // Find a header that best matches the keywords
      const matchedHeader = headers.find((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        return target.autoMatchKeywords.some((kw) => {
          const cleanKw = kw.replace(/[^a-z0-9]/g, "");
          return clean === cleanKw || clean.includes(cleanKw);
        });
      });

      if (matchedHeader) {
        mapping[target.key] = matchedHeader;
      } else {
        mapping[target.key] = "";
      }
    });

    return mapping;
  };

  const parseCsvFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length === 0) {
        alert("The uploaded file is empty.");
        return;
      }

      // Extract headers from first row
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      // Extract data rows
      const rows = lines.slice(1).map((line) =>
        line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""))
      );

      setCsvHeaders(headers);
      setRawRows(rows);
      setColumnMapping(detectMapping(headers));
      setFile(selectedFile);
      setCurrentStep(2); // Go to Column Mapping step
    };

    reader.readAsText(selectedFile);
  };

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
        parseCsvFile(dropped);
      } else {
        alert("Please upload a CSV file (.csv)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseCsvFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setCsvHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setCurrentStep(1);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSampleTemplate = () => {
    const headers = "dayOfWeek,startTime,endTime,resourceCode,subjectCode,facultyCode,programCode,semester,section";
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

  // Check if required fields are mapped
  const requiredMissing = useMemo(() => {
    return TARGET_FIELDS.filter((f) => f.required && !columnMapping[f.key]);
  }, [columnMapping]);

  // Preview of mapped rows (first 5)
  const mappedPreview = useMemo(() => {
    if (rawRows.length === 0) return [];
    const headerIndices: Record<string, number> = {};
    csvHeaders.forEach((h, idx) => {
      headerIndices[h] = idx;
    });

    return rawRows.slice(0, 5).map((row) => {
      const mappedRow: Record<string, string> = {};
      TARGET_FIELDS.forEach((tf) => {
        const csvHeader = columnMapping[tf.key];
        if (csvHeader && headerIndices[csvHeader] !== undefined) {
          mappedRow[tf.key] = row[headerIndices[csvHeader]] || "";
        } else {
          mappedRow[tf.key] = "";
        }
      });
      return mappedRow;
    });
  }, [rawRows, csvHeaders, columnMapping]);

  const handleImport = async () => {
    if (!file || requiredMissing.length > 0) return;

    setLoading(true);
    setResult(null);

    try {
      const headerIndices: Record<string, number> = {};
      csvHeaders.forEach((h, idx) => {
        headerIndices[h] = idx;
      });

      // Transform all data rows according to user's column mapping
      const mappedData = rawRows.map((row) => {
        const item: Record<string, any> = {};
        TARGET_FIELDS.forEach((tf) => {
          const csvHeader = columnMapping[tf.key];
          if (csvHeader && headerIndices[csvHeader] !== undefined) {
            item[tf.key] = row[headerIndices[csvHeader]] || null;
          } else {
            item[tf.key] = null;
          }
        });
        return item;
      });

      const res = await processTimetableImport(mappedData, file.name);
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

      setCurrentStep(1);
      setFile(null);
      setRawRows([]);
      setCsvHeaders([]);
      setColumnMapping({});
    } catch (err: any) {
      setResult({ success: false, errors: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  // Filtered past imports
  const filteredImports = useMemo(() => {
    return imports.filter((im) =>
      im.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
      (im.importedBy?.name || "").toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [imports, historySearch]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Upload & Mapping Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6 sm:p-8">
        {/* Step Indicator Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                    : currentStep > 1
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                {currentStep > 1 ? "✓" : "1"}
              </span>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  1. Upload CSV
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:block">Any CSV file</span>
              </div>
            </div>

            <div className="h-0.5 flex-1 mx-4 bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                    : currentStep > 2
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                2
              </span>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  2. Map Columns
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:block">Match CSV headers</span>
              </div>
            </div>

            <div className="h-0.5 flex-1 mx-4 bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                3
              </span>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  3. Preview & Import
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:block">Validate & sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Upload File */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                dragActive
                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 scale-[1.01]"
                  : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20 hover:border-zinc-400"
              }`}
            >
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 mb-4 shadow-xs">
                <Upload className="h-8 w-8" />
              </div>

              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Upload University Timetable CSV
              </h4>
              <p className="text-xs text-zinc-500 mb-5 max-w-md">
                Upload <strong>any</strong> timetable CSV file. You can easily map your columns in the next step, so your file does not need any fixed header names.
              </p>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Choose File</span>
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
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  Sample Template
                </button>
              </div>
            </div>

            {/* Previous Result Alert if any */}
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
        )}

        {/* STEP 2: Column Mapping */}
        {currentStep === 2 && file && (
          <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-3">
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                  Map CSV Columns to UniRMS Fields
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  File: <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{file.name}</span> ({rawRows.length} data rows detected)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColumnMapping(detectMapping(csvHeaders))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Auto-Detect Again
                </button>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TARGET_FIELDS.map((tf) => {
                const isSelected = !!columnMapping[tf.key];
                return (
                  <div
                    key={tf.key}
                    className={`p-4 rounded-xl border transition-all ${
                      tf.required && !isSelected
                        ? "border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20"
                        : isSelected
                        ? "border-blue-200 bg-blue-50/20 dark:border-blue-800 dark:bg-blue-950/10"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                        <span>{tf.label}</span>
                        {tf.required && <span className="text-red-500 text-xs font-bold">*</span>}
                      </label>
                      {tf.required && (
                        <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-2.5">{tf.description}</p>

                    <select
                      value={columnMapping[tf.key] || ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [tf.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">— Don&apos;t Import / None —</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          Column: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Validation warning if required fields missing */}
            {requiredMissing.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Please map all required fields: <strong>{requiredMissing.map((f) => f.label).join(", ")}</strong>
                </span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Upload
              </button>

              <button
                type="button"
                disabled={requiredMissing.length > 0}
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview Mapped Data & Run Import */}
        {currentStep === 3 && file && (
          <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-3">
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-emerald-600" />
                  Preview Mapped Data ({rawRows.length} Total Rows)
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verify how your CSV columns will be mapped into UniRMS before executing the import.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Adjust Mappings
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">End</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Faculty</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Sem</th>
                      <th className="px-4 py-3">Sec</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {mappedPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5 font-bold text-blue-600">{row.dayOfWeek || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{row.startTime || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{row.endTime || "—"}</td>
                        <td className="px-4 py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{row.resourceCode || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.subjectCode || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.facultyCode || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.programCode || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.semester || "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.section || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Bar during loading */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>Importing {rawRows.length} schedules...</span>
                  <span>Conflict checking in progress</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="bg-emerald-600 h-2 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change Mappings
              </button>

              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing {rawRows.length} records...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Execute Import ({rawRows.length} records)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Past Imports Card — Full Width */}
      <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Past Timetable Imports</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Audit log of batch timetable imports</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search import history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
              {filteredImports.length} {filteredImports.length === 1 ? "Batch" : "Batches"}
            </span>
          </div>
        </div>

        {filteredImports.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            No timetable imports match your criteria.
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
                {filteredImports.map((im) => (
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
