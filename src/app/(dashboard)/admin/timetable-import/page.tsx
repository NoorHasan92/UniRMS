import { getTimetableImports } from "@/app/actions/timetable.actions";
import { requireAdmin } from "@/lib/auth-utils";
import TimetableImportView from "@/components/admin/timetable-import-view";

export const dynamic = "force-dynamic";

export default async function TimetableImportPage() {
  await requireAdmin();

  const imports = await getTimetableImports();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Timetable Import</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Import bulk schedule data from CSV/Excel files.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <TimetableImportView initialImports={imports} />
      </div>
    </div>
  );
}
