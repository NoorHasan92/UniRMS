import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import UsersList from "@/components/admin/users-list";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">User Management</h1>
          <p className="text-sm text-zinc-500 mt-1">
            System accounts, administrators, and university officials.
          </p>
        </div>
      </div>

      <UsersList initialUsers={users} />
    </div>
  );
}
