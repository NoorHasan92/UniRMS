"use client";

import { useState, useMemo } from "react";
import { type Department } from "@prisma/client";
import { Plus, Edit2, Trash2, Building2, Search } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import { createDepartment, updateDepartment, deleteDepartment } from "@/app/actions/department.actions";

interface DepartmentListProps {
  initialDepartments: Department[];
  isAdmin: boolean;
}

export default function DepartmentList({ initialDepartments, isAdmin }: DepartmentListProps) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filteredDepartments = useMemo(() => {
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [departments, searchTerm]);

  function openCreateDialog() {
    setEditingDept(null);
    setCode("");
    setName("");
    setDescription("");
    setError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(dept: Department) {
    setEditingDept(dept);
    setCode(dept.code);
    setName(dept.name);
    setDescription(dept.description || "");
    setError("");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
      };

      let res;
      if (editingDept) {
        res = await updateDepartment(editingDept.id, data);
      } else {
        res = await createDepartment(data);
      }

      if (!res.success) {
        setError(res.error || "An error occurred");
      } else {
        if (editingDept) {
          setDepartments((prev) =>
            prev.map((d) => (d.id === editingDept.id ? { ...d, ...data, description: data.description || null } : d))
          );
        } else if (res.department) {
          setDepartments((prev) => [...prev, res.department].sort((a, b) => a.code.localeCompare(b.code)));
        }
        setIsDialogOpen(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const res = await deleteDepartment(id);
      if (res.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert("Failed to delete department");
      }
    } catch (err) {
      alert("An unexpected error occurred");
    }
  }

  return (
    <>
      {/* Top Toolbar */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
            {filteredDepartments.length} {filteredDepartments.length === 1 ? "Department" : "Departments"}
          </span>
        </div>

        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm" className="cursor-pointer shrink-0">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No departments found"
          description="Get started by adding a new academic department."
          action={
            isAdmin && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            )
          }
        />
      ) : filteredDepartments.length === 0 ? (
        <div className="p-12 text-center text-sm text-zinc-500">
          No departments match &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50/70 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Department Name</th>
                <th className="px-6 py-3.5">Description</th>
                {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      {dept.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{dept.name}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                    {dept.description || "—"}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditDialog(dept)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={() => !loading && setIsDialogOpen(false)}
        title={editingDept ? "Edit Department" : "Add Department"}
        description={editingDept ? "Update department details" : "Create a new academic department"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}

          <Input
            label="Department Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. CSE"
            required
            maxLength={10}
            disabled={loading}
          />

          <Input
            label="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computer Science and Engineering"
            required
            maxLength={100}
            disabled={loading}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Brief description of the department"
              disabled={loading}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
