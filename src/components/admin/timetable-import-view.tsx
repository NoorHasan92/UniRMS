"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { processTimetableImport } from "@/app/actions/timetable.actions";

export default function TimetableImportView({ initialImports }: { initialImports: any[] }) {
  const [imports, setImports] = useState(initialImports);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; recordsImported?: number; recordsFailed?: number; errors?: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      // For MVP, we'll simulate parsing since we don't have a real CSV parser setup in the browser yet
      // In a real app, you'd use Papaparse or read it as text and split by newlines
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        // Skip header
        const dataRows = lines.slice(1);
        
        const parsedData = dataRows.map(row => {
          // Assuming basic CSV: dayOfWeek,startTime,endTime,resourceCode,subjectCode,facultyCode,programCode,semester,section
          const cols = row.split(',').map(c => c.trim());
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
        
        // Add optimistic import to list
        if (res.success) {
          setImports([{
            id: 'temp-' + Date.now(),
            filename: file.name,
            status: res.recordsFailed === 0 ? "COMPLETED" : (res.recordsImported === 0 ? "FAILED" : "COMPLETED"),
            recordsImported: res.recordsImported,
            recordsFailed: res.recordsFailed,
            createdAt: new Date(),
            importedBy: { name: "You" }
          }, ...imports]);
        }
        
        setFile(null);
        setLoading(false);
      };
      
      reader.onerror = () => {
        setResult({ success: false, errors: ["Failed to read file"] });
        setLoading(false);
      };
      
      reader.readAsText(file);
    } catch (err: any) {
      setResult({ success: false, errors: [err.message] });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Upload Timetable Data</h3>
        
        <div className="max-w-xl">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-white dark:bg-zinc-900">
            <Upload className="h-10 w-10 text-zinc-400 mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Upload a CSV file containing timetable entries.
              <br />
              Format: <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">dayOfWeek,startTime,endTime,resourceCode,subjectCode,facultyCode,programCode,semester,section</code>
            </p>
            
            <label className="cursor-pointer px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
              <span>Select File</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
            
            {file && (
              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg flex items-center gap-3 w-full border border-zinc-200 dark:border-zinc-700">
                <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.name}</span>
                <span className="text-xs text-zinc-500 ml-auto shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? "Processing..." : "Start Import"}
            </button>
          </div>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${result.success && result.recordsFailed === 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <h4 className={`font-medium flex items-center gap-2 ${result.success && result.recordsFailed === 0 ? "text-emerald-800" : "text-red-800"}`}>
              {result.success && result.recordsFailed === 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              Import Results
            </h4>
            <div className="mt-2 space-y-1 text-sm">
              <p className={result.success ? "text-emerald-700" : "text-red-700"}>Successfully imported: {result.recordsImported || 0} records</p>
              <p className="text-red-700">Failed: {result.recordsFailed || 0} records</p>
            </div>
            
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto">
                <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
                <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Past Imports</h3>
        
        {imports.length === 0 ? (
          <p className="text-sm text-zinc-500">No timetable imports have been performed yet.</p>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">File Name</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Success / Fail</th>
                  <th className="px-4 py-3 font-medium">Imported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {imports.map((im) => (
                  <tr key={im.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        {im.filename}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {format(new Date(im.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        im.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                        im.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {im.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      <span className="text-emerald-600 font-medium">{im.recordsImported}</span> / <span className="text-red-600 font-medium">{im.recordsFailed}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {im.importedBy?.name}
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
