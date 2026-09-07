"use client";

import { AlertTriangle, MapPin, Users, User, ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { DAY_FULL_LABELS } from "@/lib/constants";
import { formatTime12h } from "@/lib/time-utils";

type ScheduleItem = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  departmentId: string | null;
  programId: string | null;
  year: number | null;
  section: string | null;
  subjectId: string | null;
  facultyId: string | null;
  resource: { code: string; type: string };
  department: { code: string } | null;
  program: { name: string } | null;
  faculty: { name: string } | null;
  subject: { name: string; code: string } | null;
};

interface ConflictItem {
  type: string;
  scheduleA: ScheduleItem;
  scheduleB: ScheduleItem;
  description: string;
}

export default function ConflictsView({ initialConflicts }: { initialConflicts: ConflictItem[] }) {
  if (initialConflicts.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex items-center justify-center">
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-emerald-500" />}
          title="No Conflicts Detected"
          description="The master schedule is perfectly aligned with no overlapping classes or double bookings."
        />
      </div>
    );
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case "RESOURCE": return <MapPin className="h-5 w-5 text-red-500" />;
      case "FACULTY": return <User className="h-5 w-5 text-amber-500" />;
      case "ACADEMIC_GROUP": return <Users className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getConflictBadge = (type: string) => {
    switch (type) {
      case "RESOURCE": return <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Double Booked Room</span>;
      case "FACULTY": return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">Double Booked Faculty</span>;
      case "ACADEMIC_GROUP": return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Student Group Overlap</span>;
      default: return null;
    }
  };

  const ScheduleCard = ({ schedule }: { schedule: ScheduleItem }) => (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2">
      <div className="flex justify-between items-start">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">
          {formatTime12h(schedule.startTime)} - {formatTime12h(schedule.endTime)}
        </div>
        <div className="text-xs text-zinc-500 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {schedule.resource.code}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-medium text-blue-600 dark:text-blue-400">
          {schedule.subject?.name || "Unknown Subject"}
        </div>
        <div className="text-zinc-600 dark:text-zinc-400 mt-1">
          {schedule.faculty?.name || "Unassigned Faculty"}
        </div>
        <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          {schedule.department?.code || ""} {schedule.program?.name || ""} 
          {schedule.year ? ` Year ${schedule.year}` : ""} {schedule.section ? ` Sec ${schedule.section}` : ""}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800 dark:text-red-300">Action Required</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Found {initialConflicts.length} scheduling conflict{initialConflicts.length === 1 ? '' : 's'}. 
            These must be resolved to ensure accurate resource utilization and availability calculations.
            Go to the Schedule Editor to make corrections.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {initialConflicts.map((conflict, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getConflictIcon(conflict.type)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {DAY_FULL_LABELS[conflict.scheduleA.dayOfWeek]}
                    </span>
                    {getConflictBadge(conflict.type)}
                  </div>
                  <p className="text-sm text-zinc-500 mt-0.5">{conflict.description}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <ScheduleCard schedule={conflict.scheduleA} />
              
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white dark:bg-zinc-900 rounded-full p-2 border border-zinc-200 dark:border-zinc-800 z-10 shadow-sm text-red-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
              
              <ScheduleCard schedule={conflict.scheduleB} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
