import { getTimetableImports } from "@/app/actions/timetable.actions";
import { requireAdmin } from "@/lib/auth-utils";
import TimetableImportView from "@/components/admin/timetable-import-view";

export const dynamic = "force-dynamic";

export default async function TimetableImportPage() {
  await requireAdmin();

  const imports = await getTimetableImports();

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Timetable Import</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Import bulk schedule data from custom or standard CSV files with intelligent column mapping.
          </p>
        </div>
      </div>

      <TimetableImportView initialImports={imports} />
    </div>
  );
}
