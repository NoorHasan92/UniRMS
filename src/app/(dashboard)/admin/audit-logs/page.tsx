import { getAuditLogs } from "@/lib/services/audit.service";
import { requireAdmin } from "@/lib/auth-utils";
import AuditLogsView from "@/components/admin/audit-logs-view";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage(props: { searchParams: Promise<{ page?: string; entityType?: string }> }) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const entityType = searchParams?.entityType || undefined;

  const result = await getAuditLogs({ page, pageSize: 50, entityType });

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Audit Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track all administrative actions, timetable imports, and resource changes.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <AuditLogsView data={result} currentEntityType={entityType} />
      </div>
    </div>
  );
}
