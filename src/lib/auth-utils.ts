import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

import { redirect } from "next/navigation";

/**
 * Get the current session on the server side.
 * Returns null if not authenticated.
 */
export async function getServerSession(): Promise<Session | null> {
  return await auth();
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Require ADMIN role. Throws if not admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if ((session.user as { role: string }).role !== "ADMIN") {
    redirect("/");
  }
  return session;
}

/**
 * Get the current user ID from session.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user?.id as string;
}
