"use client";

import { useState } from "react";
import { type Resource, type Department } from "@prisma/client";
import { Plus, Edit2, Trash2, Building } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import { createResource, updateResource, deleteResource } from "@/app/actions/resource.actions";
import { BLOCK_LABELS } from "@/lib/constants";

type ResourceWithDept = Resource & { department: Department | null };

interface ResourceListProps {
  initialResources: ResourceWithDept[];
  departments: Department[];
  isAdmin: boolean;
}

export default function ResourceList({ initialResources, departments, isAdmin }: ResourceListProps) {
  const [resources, setResources] = useState<ResourceWithDept[]>(initialResources);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceWithDept | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Resource["type"]>("CLASSROOM");
  const [block, setBlock] = useState<Resource["block"]>("LEFT");
  const [floor, setFloor] = useState<number>(1);
  const [roomNumber, setRoomNumber] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(40);
  const [description, setDescription] = useState("");
  const [hasProjector, setHasProjector] = useState(false);
  const [hasSmartBoard, setHasSmartBoard] = useState(false);
  const [computerCount, setComputerCount] = useState<number>(0);

  function openCreateDialog() {
    setEditingResource(null);
    setCode("");
    setName("");
    setType("CLASSROOM");
    setBlock("LEFT");
    setFloor(1);
    setRoomNumber("");
    setDepartmentId("");
    setCapacity(40);
    setDescription("");
    setHasProjector(false);
    setHasSmartBoard(false);
    setComputerCount(0);
    setError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(res: ResourceWithDept) {
    setEditingResource(res);
    setCode(res.code);
    setName(res.name);
    setType(res.type);
    setBlock(res.block);
    setFloor(res.floor);
    setRoomNumber(res.roomNumber);
    setDepartmentId(res.departmentId || "");
    setCapacity(res.capacity);
    setDescription(res.description || "");
    setHasProjector(res.hasProjector);
    setHasSmartBoard(res.hasSmartBoard);
    setComputerCount(res.computerCount);
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
        type,
        block,
        floor,
        roomNumber: roomNumber.trim(),
        departmentId: departmentId || undefined,
        capacity,
        description: description.trim() || undefined,
        hasProjector,
        hasSmartBoard,
        computerCount,
      };

      let res;
      if (editingResource) {
        res = await updateResource(editingResource.id, data);
      } else {
        res = await createResource(data);
      }

      if (!res.success) {
        setError(res.error || "An error occurred");
      } else {
        const fullResource: ResourceWithDept = {
          ...(res.resource as Resource),
          department: departments.find(d => d.id === data.departmentId) || null,
        };

        if (editingResource) {
          setResources((prev) =>
            prev.map((r) => (r.id === editingResource.id ? fullResource : r))
          );
        } else {
          setResources((prev) => [...prev, fullResource].sort((a, b) => a.code.localeCompare(b.code)));
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
    if (!confirm("Are you sure you want to delete this resource?")) return;
    
    try {
      const res = await deleteResource(id);
      if (res.success) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert("Failed to delete resource");
      }
    } catch (err) {
      alert("An unexpected error occurred");
    }
  }

  const deptOptions = departments.map((d) => ({ value: d.id, label: d.code + " - " + d.name }));
  const typeOptions = [
    { value: "CLASSROOM", label: "Classroom" },
    { value: "LAB", label: "Laboratory" },
    { value: "SEMINAR_HALL", label: "Seminar Hall" },
    { value: "AUDITORIUM", label: "Auditorium" },
    { value: "CONFERENCE_ROOM", label: "Conference Room" },
    { value: "OTHER", label: "Other" },
  ];
  const blockOptions = [
    { value: "LEFT", label: "Left Block" },
    { value: "RIGHT", label: "Right Block" },
  ];

  return (
    <>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">All Resources</h2>
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={<Building className="h-12 w-12" />}
          title="No resources found"
          description="Get started by adding a new classroom or lab."
          action={
            isAdmin && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add Resource
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Code & Name</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Department</th>
                <th className="px-6 py-3 font-medium">Capacity</th>
                <th className="px-6 py-3 font-medium">Facilities</th>
                {isAdmin && <th className="px-6 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resources.map((res) => (
                <tr key={res.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{res.code}</div>
                    <div className="text-xs text-zinc-500">{res.name}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {BLOCK_LABELS[res.block]} - Floor {res.floor}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {res.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {res.department?.code || "—"}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{res.capacity}</td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    <div className="flex gap-2">
                      {res.hasProjector && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Projector</span>}
                      {res.hasSmartBoard && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">SmartBoard</span>}
                      {res.computerCount > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{res.computerCount} PCs</span>}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditDialog(res)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(res.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
        title={editingResource ? "Edit Resource" : "Add Resource"}
        description={editingResource ? "Update resource details" : "Create a new classroom, lab, or hall"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Resource Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. RB-701"
              required
              maxLength={20}
              disabled={loading}
            />
            <Input
              label="Resource Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CSE Classroom 701"
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as Resource["type"])}
              options={typeOptions}
              required
              disabled={loading}
            />
            <Select
              label="Department (Optional)"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={deptOptions}
              placeholder="-- Unassigned --"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Block"
              value={block}
              onChange={(e) => setBlock(e.target.value as Resource["block"])}
              options={blockOptions}
              required
              disabled={loading}
            />
            <Input
              label="Floor"
              type="number"
              min={1}
              max={8}
              value={floor}
              onChange={(e) => setFloor(parseInt(e.target.value) || 1)}
              required
              disabled={loading}
            />
            <Input
              label="Room Number"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 701"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 40)}
              required
              disabled={loading}
            />
            <Input
              label="Computer Count"
              type="number"
              min={0}
              value={computerCount}
              onChange={(e) => setComputerCount(parseInt(e.target.value) || 0)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={hasProjector}
                onChange={(e) => setHasProjector(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              Has Projector
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={hasSmartBoard}
                onChange={(e) => setHasSmartBoard(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              Has Smart Board
            </label>
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
              {editingResource ? "Save Changes" : "Create Resource"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
