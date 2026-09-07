import { getDepartments } from "@/app/actions/department.actions";
import AvailabilitySearch from "@/components/availability/availability-search";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  await requireAuth();
  const departments = await getDepartments();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Find Available Room</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Search for continuously available slots or view current daily status.
          </p>
        </div>
      </div>

      <AvailabilitySearch departments={departments} />
    </div>
  );
}
