"use client";

import { useState } from "react";
import { type Schedule, type Resource, type Department, type Program, type Subject, type Faculty } from "@prisma/client";
import { Plus, Edit2, Trash2, Calendar, Filter } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import { createSchedule, updateSchedule, deleteSchedule } from "@/app/actions/schedule.actions";
import { DAY_FULL_LABELS, TIME_SLOTS } from "@/lib/constants";
import { formatTime12h, durationMinutes } from "@/lib/time-utils";

type FullSchedule = Schedule & {
  resource: Resource;
  department: Department | null;
  program: Program | null;
  subject: Subject | null;
  faculty: Faculty | null;
};

interface ScheduleViewProps {
  initialSchedules: FullSchedule[];
  departments: Department[];
  resources: Resource[];
  programs: Program[];
  subjects: Subject[];
  faculties: Faculty[];
  isAdmin: boolean;
}

export default function ScheduleView({
  initialSchedules,
  departments,
  resources,
  programs,
  subjects,
  faculties,
  isAdmin
}: ScheduleViewProps) {
  const [schedules, setSchedules] = useState<FullSchedule[]>(initialSchedules);
  const [activeDay, setActiveDay] = useState<string>("MONDAY");
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FullSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<string>("MONDAY");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [resourceId, setResourceId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");
  const [year, setYear] = useState<number | "">("");
  const [section, setSection] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [facultyId, setFacultyId] = useState<string>("");

  const filteredSchedules = schedules.filter(s => s.dayOfWeek === activeDay);

  function openCreateDialog() {
    setEditingSchedule(null);
    setDayOfWeek(activeDay);
    setStartTime("09:00");
    setEndTime("10:00");
    setResourceId(resources[0]?.id || "");
    setDepartmentId("");
    setProgramId("");
    setYear("");
    setSection("");
    setSubjectId("");
    setFacultyId("");
    setError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(s: FullSchedule) {
    setEditingSchedule(s);
    setDayOfWeek(s.dayOfWeek);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setResourceId(s.resourceId);
    setDepartmentId(s.departmentId || "");
    setProgramId(s.programId || "");
    setYear(s.year || "");
    setSection(s.section || "");
    setSubjectId(s.subjectId || "");
    setFacultyId(s.facultyId || "");
    setError("");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (durationMinutes(startTime, endTime) <= 0) {
      setError("End time must be after start time");
      setLoading(false);
      return;
    }

    try {
      const data = {
        dayOfWeek: dayOfWeek as any,
        startTime,
        endTime,
        resourceId,
        departmentId: departmentId || undefined,
        programId: programId || undefined,
        year: year ? Number(year) : undefined,
        section: section.trim() || undefined,
        subjectId: subjectId || undefined,
        facultyId: facultyId || undefined,
      };

      let res;
      if (editingSchedule) {
        res = await updateSchedule(editingSchedule.id, data);
      } else {
        res = await createSchedule(data);
      }

      if (!res.success) {
        setError(res.error || "An error occurred");
      } else {
        const updatedSchedules = editingSchedule
          ? schedules.map(s => s.id === editingSchedule.id ? (res.schedule as FullSchedule) : s)
          : [...schedules, (res.schedule as FullSchedule)];
        
        // Sorting by start time
        setSchedules(updatedSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime)));
        setIsDialogOpen(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    
    try {
      const res = await deleteSchedule(id);
      if (res.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete schedule");
      }
    } catch (err) {
      alert("An unexpected error occurred");
    }
  }

  // Options
  const dayOptions = Object.entries(DAY_FULL_LABELS).map(([val, label]) => ({ value: val, label }));
  const resourceOptions = resources.map(r => ({ value: r.id, label: r.code + " - " + r.name }));
  const deptOptions = departments.map(d => ({ value: d.id, label: d.code }));
  const progOptions = programs.map(p => ({ value: p.id, label: p.name }));
  const subOptions = subjects.map(s => ({ value: s.id, label: s.code + " - " + s.name }));
  const facOptions = faculties.map(f => ({ value: f.id, label: f.name }));
  const timeOptions = TIME_SLOTS.map(t => ({ value: t, label: formatTime12h(t) }));

  return (
    <div className="flex flex-col h-full">
      {/* Day Selector Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 gap-1">
        {Object.entries(DAY_FULL_LABELS).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setActiveDay(val)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeDay === val
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm" className="ml-2">
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        )}
      </div>

      <div className="flex-1 p-0 overflow-x-auto">
        {filteredSchedules.length === 0 ? (
          <div className="h-full min-h-[400px] flex items-center justify-center">
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No classes scheduled"
              description={`There are no classes scheduled for ${DAY_FULL_LABELS[activeDay]}.`}
            />
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Resource</th>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Faculty</th>
                <th className="px-6 py-4 font-semibold">Class Group</th>
                {isAdmin && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredSchedules.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">
                      {formatTime12h(s.startTime)} - {formatTime12h(s.endTime)}
                    </div>
                    <div className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 inline-block px-2 py-0.5 rounded-md">
                      {durationMinutes(s.startTime, s.endTime)} mins
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-semibold text-blue-600 mb-0.5">{s.resource.code}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">{s.resource.type.replace("_", " ")}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">{s.subject?.code ?? "—"}</div>
                    <div className="text-sm text-zinc-500 truncate max-w-[180px]">{s.subject?.name ?? "—"}</div>
                  </td>
                  <td className="px-6 py-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {s.faculty?.name ?? "—"}
                  </td>
                  <td className="px-6 py-5">
                    {s.department ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {s.department.code} {s.program?.name}
                        </span>
                        <span className="text-sm text-zinc-500">
                          {s.year ? `Year ${s.year}` : ""} {s.section ? `Sec ${s.section}` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditDialog(s)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={() => !loading && setIsDialogOpen(false)}
        title={editingSchedule ? "Edit Schedule" : "Add Schedule"}
        description="Schedule a recurring class or activity"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Day of Week"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              options={dayOptions}
              required
              disabled={loading}
            />
            <Select
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              options={timeOptions}
              required
              disabled={loading}
            />
            <Select
              label="End Time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              options={timeOptions}
              required
              disabled={loading}
            />
          </div>

          <Select
            label="Resource (Room)"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            options={resourceOptions}
            required
            disabled={loading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Department (Optional)"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={deptOptions}
              placeholder="-- Select --"
              disabled={loading}
            />
            <Select
              label="Program (Optional)"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              options={progOptions}
              placeholder="-- Select --"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Year (Optional)"
              type="number"
              min={1}
              max={4}
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
              placeholder="1-4"
              disabled={loading}
            />
            <Input
              label="Section (Optional, 1st Year only)"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. A"
              maxLength={5}
              disabled={loading || (year !== "" && year !== 1)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Subject (Optional)"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              options={subOptions}
              placeholder="-- Select --"
              disabled={loading}
            />
            <Select
              label="Faculty (Optional)"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              options={facOptions}
              placeholder="-- Select --"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editingSchedule ? "Save Changes" : "Create Schedule"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
