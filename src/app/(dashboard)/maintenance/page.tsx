import { getMaintenanceBlocks } from "@/app/actions/maintenance.actions";
import { getResources } from "@/app/actions/resource.actions";
import { requireAdmin } from "@/lib/auth-utils";
import MaintenanceList from "@/components/maintenance/maintenance-list";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requireAdmin();

  const [blocks, resources] = await Promise.all([
    getMaintenanceBlocks(),
    getResources(),
  ]);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Maintenance Blocking</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Block resources for maintenance, renovations, or exams to prevent scheduling and booking.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <MaintenanceList initialBlocks={blocks} resources={resources} />
      </div>
    </div>
  );
}
