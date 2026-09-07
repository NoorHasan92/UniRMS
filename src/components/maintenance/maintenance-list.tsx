"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, ShieldAlert } from "lucide-react";
import { createMaintenanceBlock, deleteMaintenanceBlock } from "@/app/actions/maintenance.actions";
import EmptyState from "@/components/ui/empty-state";

export default function MaintenanceList({
  initialBlocks,
  resources,
}: {
  initialBlocks: any[];
  resources: any[];
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    resourceId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await createMaintenanceBlock(formData);
      if (result.success && result.block) {
        setBlocks([...blocks, result.block].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setIsFormOpen(false);
        setFormData({ resourceId: "", startDate: "", endDate: "", reason: "" });
      } else {
        setError(result.error || "Failed to create block");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this maintenance block?")) return;
    
    try {
      const result = await deleteMaintenanceBlock(id);
      if (result.success) {
        setBlocks(blocks.filter((b) => b.id !== id));
      } else {
        alert("Failed to delete block");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting block");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {isFormOpen ? "Cancel" : <><Plus className="h-4 w-4" /> Add Block</>}
        </button>
      </div>

      {isFormOpen && (
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">New Maintenance Block</h3>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Resource <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.resourceId}
                  onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Resource</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={formData.startDate}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. AC Repair, Exam Setup, Renovation"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : "Save Block"}
              </button>
            </div>
          </form>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<ShieldAlert className="h-12 w-12 text-zinc-400" />}
            title="No Maintenance Blocks"
            description="Resources are not currently blocked for any maintenance activities."
          />
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {blocks.map((block) => (
            <div key={block.id} className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {block.resource.code} - {block.resource.name}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      {block.reason}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-medium">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(new Date(block.startDate), "MMM d, yyyy")} 
                      {block.startDate !== block.endDate && ` - ${format(new Date(block.endDate), "MMM d, yyyy")}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => handleDelete(block.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove Block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
