import { findScheduleConflicts } from "@/lib/services/availability.service";
import { requireAdmin } from "@/lib/auth-utils";
import ConflictsView from "@/components/schedules/conflicts-view";

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  await requireAdmin();

  const conflicts = await findScheduleConflicts();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Schedule Conflicts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Detect and resolve overlapping classes, double-booked rooms, and faculty scheduling errors.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <ConflictsView initialConflicts={conflicts} />
      </div>
    </div>
  );
}
