"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { scheduleSchema, type ScheduleInput } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";
import { checkScheduleConflict } from "@/lib/services/availability.service";

export async function createSchedule(data: ScheduleInput) {
  const session = await requireAdmin();
  const parsed = scheduleSchema.parse(data);

  // Check conflicts
  const conflictCheck = await checkScheduleConflict({
    ...parsed,
  });

  if (conflictCheck.hasConflict) {
    return { success: false, error: "Conflict detected: " + conflictCheck.conflicts.join(", ") };
  }

  const schedule = await prisma.schedule.create({
    data: parsed,
    include: {
      resource: true,
      department: true,
      program: true,
      subject: true,
      faculty: true,
    },
  });

  await logAudit({
    userId: session.user!.id,
    action: "CREATE",
    entityType: "SCHEDULE",
    entityId: schedule.id,
    metadata: { day: schedule.dayOfWeek, time: `${schedule.startTime}-${schedule.endTime}`, resource: schedule.resource.code },
  });

  revalidatePath("/schedules");
  return { success: true, schedule };
}

export async function updateSchedule(id: string, data: ScheduleInput) {
  const session = await requireAdmin();
  const parsed = scheduleSchema.parse(data);

  // Check conflicts (exclude self)
  const conflictCheck = await checkScheduleConflict({
    ...parsed,
    excludeScheduleId: id,
  });

  if (conflictCheck.hasConflict) {
    return { success: false, error: "Conflict detected: " + conflictCheck.conflicts.join(", ") };
  }

  const schedule = await prisma.schedule.update({
    where: { id },
    data: parsed,
    include: {
      resource: true,
      department: true,
      program: true,
      subject: true,
      faculty: true,
    },
  });

  await logAudit({
    userId: session.user!.id,
    action: "UPDATE",
    entityType: "SCHEDULE",
    entityId: schedule.id,
    metadata: { day: schedule.dayOfWeek, time: `${schedule.startTime}-${schedule.endTime}`, resource: schedule.resource.code },
  });

  revalidatePath("/schedules");
  return { success: true, schedule };
}

export async function deleteSchedule(id: string) {
  const session = await requireAdmin();

  // Hard delete is fine for schedules, or soft delete
  const schedule = await prisma.schedule.update({
    where: { id },
    data: { isActive: false },
    include: { resource: true },
  });

  await logAudit({
    userId: session.user!.id,
    action: "DELETE",
    entityType: "SCHEDULE",
    entityId: schedule.id,
    metadata: { day: schedule.dayOfWeek, resource: schedule.resource.code },
  });

  revalidatePath("/schedules");
  return { success: true };
}
