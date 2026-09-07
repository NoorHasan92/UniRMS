import { getUpcomingBookings } from "@/app/actions/booking.actions";
import { getResources } from "@/app/actions/resource.actions";
import { getDepartments } from "@/app/actions/department.actions";
import BookingList from "@/components/bookings/booking-list";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await requireAuth();
  const [bookings, resources, departments] = await Promise.all([
    getUpcomingBookings(),
    getResources(),
    getDepartments(),
  ]);

  const currentUserId = session.user?.id as string;
  const isAdmin = (session.user as any).role === "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Ad-hoc Bookings</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage one-time reservations for events, seminars, or special classes.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px]">
        <BookingList
          initialBookings={bookings}
          resources={resources}
          departments={departments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
