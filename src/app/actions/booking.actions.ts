"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { bookingSchema, type BookingInput } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";
import { getResourceDayStatus } from "@/lib/services/availability.service";
import { getDayOfWeek, intervalsOverlap, timeToMinutes } from "@/lib/time-utils";

export async function createBooking(data: BookingInput) {
  const session = await requireAuth();
  const parsed = bookingSchema.parse(data);

  // Check conflicts using Availability Engine logic
  const dayOfWeek = getDayOfWeek(new Date(parsed.date));
  const dayStatus = await getResourceDayStatus(parsed.resourceId, dayOfWeek, parsed.date);

  if (!dayStatus) {
    return { success: false, error: "Resource not found" };
  }

  // Check if requested time overlaps with any occupied interval
  const hasConflict = dayStatus.occupiedIntervals.some((interval) =>
    intervalsOverlap(parsed.startTime, parsed.endTime, interval.start, interval.end)
  );

  if (hasConflict) {
    return { success: false, error: "Time slot is already occupied" };
  }

  const booking = await prisma.booking.create({
    data: {
      ...parsed,
      date: new Date(parsed.date),
      createdById: session.user?.id as string,
      status: "RESERVED",
    },
    include: {
      resource: true,
      department: true,
      createdBy: {
        select: { name: true, email: true }
      }
    },
  });

  await logAudit({
    userId: session.user!.id,
    action: "CREATE",
    entityType: "BOOKING",
    entityId: booking.id,
    metadata: { date: parsed.date, time: `${parsed.startTime}-${parsed.endTime}`, resource: (booking as any).resource.code },
  });

  revalidatePath("/bookings");
  revalidatePath("/availability");
  revalidatePath("/");
  return { success: true, booking };
}

export async function cancelBooking(id: string) {
  const session = await requireAuth();

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { resource: true },
  });

  if (!existing) {
    return { success: false, error: "Booking not found" };
  }

  // Only creator or admin can cancel
  if (existing.createdById !== session.user!.id && (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized to cancel this booking" };
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: { resource: true },
  });

  await logAudit({
    userId: session.user!.id,
    action: "CANCEL",
    entityType: "BOOKING",
    entityId: booking.id,
    metadata: { date: booking.date.toISOString().split("T")[0], resource: (booking as any).resource.code },
  });

  revalidatePath("/bookings");
  revalidatePath("/availability");
  revalidatePath("/");
  return { success: true };
}

export async function getUpcomingBookings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.booking.findMany({
    where: {
      date: { gte: today },
    },
    include: {
      resource: true,
      department: true,
      createdBy: {
        select: { name: true, email: true }
      }
    },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
  });
}
