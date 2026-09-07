/**
 * Availability Engine — The core of UniRMS.
 *
 * Calculates resource utilization, free/occupied intervals,
 * continuous availability, and daily status from schedule data.
 *
 * This service is framework-independent and can be used by
 * API routes, server actions, or the AI assistant.
 */

import prisma from "@/lib/prisma";
import { WORKING_HOURS, RESOURCE_STATUS, type ResourceStatus } from "@/lib/constants";
import {
  timeToMinutes,
  minutesToTime,
  mergeIntervals,
  getDayOfWeek,
  getCurrentTimeIST,
  intervalsOverlap,
} from "@/lib/time-utils";
import type {
  ResourceDayStatus,
  OccupiedInterval,
  FreeInterval,
  AvailabilityFilters,
  WeeklyUtilization,
  DashboardSummary,
} from "@/types";

const WORK_START = timeToMinutes(WORKING_HOURS.start);
const WORK_END = timeToMinutes(WORKING_HOURS.end);

// ==========================================
// Core: Get Resource Day Status
// ==========================================

/**
 * Calculate the full daily status for a single resource on a given day.
 * This is the fundamental building block of all availability queries.
 */
export async function getResourceDayStatus(
  resourceId: string,
  dayOfWeek: string,
  date?: string
): Promise<ResourceDayStatus | null> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isActive: true },
    include: { department: true },
  });

  if (!resource) return null;

  // Fetch schedule entries for this resource on this day
  const schedules = await prisma.schedule.findMany({
    where: {
      resourceId,
      dayOfWeek: dayOfWeek as never,
      isActive: true,
    },
    include: {
      department: true,
      program: true,
      subject: true,
      faculty: true,
    },
    orderBy: { startTime: "asc" },
  });

  // Fetch bookings for this resource on the specific date
  let bookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  if (date) {
    bookings = await prisma.booking.findMany({
      where: {
        resourceId,
        date: new Date(date),
        status: "RESERVED",
      },
      include: { department: true },
      orderBy: { startTime: "asc" },
    });
  }

  // Fetch maintenance blocks for this date
  let maintenanceBlocks: Awaited<ReturnType<typeof prisma.maintenanceBlock.findMany>> = [];
  if (date) {
    const dateObj = new Date(date);
    maintenanceBlocks = await prisma.maintenanceBlock.findMany({
      where: {
        resourceId,
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
      },
    });
  }

  // Build occupied intervals from all sources
  const occupied: OccupiedInterval[] = [];

  for (const s of schedules) {
    occupied.push({
      start: s.startTime,
      end: s.endTime,
      type: "schedule",
      label: [
        s.department?.code,
        s.program?.name,
        s.year ? `Year ${s.year}` : null,
        s.section ? `Sec ${s.section}` : null,
      ]
        .filter(Boolean)
        .join(" ") || "Scheduled",
      departmentCode: s.department?.code ?? undefined,
      programName: s.program?.name ?? undefined,
      year: s.year ?? undefined,
      section: s.section ?? undefined,
      subjectName: s.subject?.name ?? undefined,
      facultyName: s.faculty?.name ?? undefined,
    });
  }

  for (const b of bookings as any[]) {
    occupied.push({
      start: b.startTime,
      end: b.endTime,
      type: "booking",
      label: b.title,
      departmentCode: b.department?.code ?? undefined,
    });
  }

  for (const m of maintenanceBlocks) {
    occupied.push({
      start: WORKING_HOURS.start,
      end: WORKING_HOURS.end,
      type: "maintenance",
      label: `Maintenance: ${m.reason}`,
    });
  }

  // Calculate merged occupied intervals (to avoid double-counting)
  const mergedOccupied = mergeIntervals(
    occupied.map((o) => ({ start: o.start, end: o.end }))
  );

  // Calculate total scheduled minutes (within working hours only)
  let scheduledMinutes = 0;
  for (const interval of mergedOccupied) {
    const start = Math.max(timeToMinutes(interval.start), WORK_START);
    const end = Math.min(timeToMinutes(interval.end), WORK_END);
    if (end > start) {
      scheduledMinutes += end - start;
    }
  }

  const scheduledHours = +(scheduledMinutes / 60).toFixed(2);
  const utilizationPercent = +(
    (scheduledMinutes / WORKING_HOURS.totalMinutes) *
    100
  ).toFixed(2);

  // Determine status
  let status: ResourceStatus;
  if (scheduledMinutes === 0) {
    status = RESOURCE_STATUS.FULLY_UNUSED;
  } else if (scheduledMinutes >= WORKING_HOURS.totalMinutes) {
    status = RESOURCE_STATUS.FULLY_OCCUPIED;
  } else {
    status = RESOURCE_STATUS.PARTIALLY_USED;
  }

  // Calculate free intervals within working hours
  const freeIntervals = calculateFreeIntervals(mergedOccupied);

  // Calculate continuous free slots (same as free intervals but explicitly named)
  const continuousFreeSlots = freeIntervals.filter(
    (f) => f.durationMinutes >= 30
  );

  const longestFreeSlotMinutes =
    freeIntervals.length > 0
      ? Math.max(...freeIntervals.map((f) => f.durationMinutes))
      : scheduledMinutes === 0
      ? WORKING_HOURS.totalMinutes
      : 0;

  // Current time check
  const currentTime = getCurrentTimeIST();
  const currentMinutes = timeToMinutes(currentTime);
  let isCurrentlyBusy = false;
  if (currentMinutes >= WORK_START && currentMinutes < WORK_END) {
    isCurrentlyBusy = mergedOccupied.some((interval) => {
      const start = timeToMinutes(interval.start);
      const end = timeToMinutes(interval.end);
      return currentMinutes >= start && currentMinutes < end;
    });
  }

  // Next scheduled class
  let nextScheduledClass: OccupiedInterval | null = null;
  if (currentMinutes >= WORK_START && currentMinutes < WORK_END) {
    const upcoming = occupied.filter(
      (o) => timeToMinutes(o.start) > currentMinutes
    );
    if (upcoming.length > 0) {
      nextScheduledClass = upcoming.sort(
        (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
      )[0];
    }
  }

  return {
    resourceId: resource.id,
    resourceCode: resource.code,
    resourceName: resource.name,
    resourceType: resource.type,
    block: resource.block,
    floor: resource.floor,
    departmentCode: resource.department?.code ?? undefined,
    capacity: resource.capacity,
    hasProjector: resource.hasProjector,
    hasSmartBoard: resource.hasSmartBoard,
    computerCount: resource.computerCount,
    date: date ?? "",
    dayOfWeek,
    status,
    scheduledMinutes,
    scheduledHours,
    utilizationPercent,
    occupiedIntervals: occupied,
    freeIntervals,
    continuousFreeSlots,
    longestFreeSlotMinutes,
    isCurrentlyBusy,
    nextScheduledClass,
  };
}

/**
 * Calculate free intervals within working hours given merged occupied intervals.
 */
function calculateFreeIntervals(
  mergedOccupied: { start: string; end: string }[]
): FreeInterval[] {
  const free: FreeInterval[] = [];

  if (mergedOccupied.length === 0) {
    // Entire working period is free
    const dur = WORKING_HOURS.totalMinutes;
    free.push({
      start: WORKING_HOURS.start,
      end: WORKING_HOURS.end,
      durationMinutes: dur,
      durationHours: +(dur / 60).toFixed(2),
    });
    return free;
  }

  // Sort by start time
  const sorted = mergedOccupied
    .map((o) => ({
      start: Math.max(timeToMinutes(o.start), WORK_START),
      end: Math.min(timeToMinutes(o.end), WORK_END),
    }))
    .filter((o) => o.end > o.start)
    .sort((a, b) => a.start - b.start);

  // Gap before first occupied
  if (sorted.length > 0 && sorted[0].start > WORK_START) {
    const dur = sorted[0].start - WORK_START;
    free.push({
      start: minutesToTime(WORK_START),
      end: minutesToTime(sorted[0].start),
      durationMinutes: dur,
      durationHours: +(dur / 60).toFixed(2),
    });
  }

  // Gaps between occupied intervals
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    if (gapEnd > gapStart) {
      const dur = gapEnd - gapStart;
      free.push({
        start: minutesToTime(gapStart),
        end: minutesToTime(gapEnd),
        durationMinutes: dur,
        durationHours: +(dur / 60).toFixed(2),
      });
    }
  }

  // Gap after last occupied
  if (sorted.length > 0 && sorted[sorted.length - 1].end < WORK_END) {
    const dur = WORK_END - sorted[sorted.length - 1].end;
    free.push({
      start: minutesToTime(sorted[sorted.length - 1].end),
      end: minutesToTime(WORK_END),
      durationMinutes: dur,
      durationHours: +(dur / 60).toFixed(2),
    });
  }

  return free;
}

// ==========================================
// Bulk: Get All Resources Day Status
// ==========================================

/**
 * Get day status for all resources matching filters.
 */
export async function getAllResourcesDayStatus(
  filters: AvailabilityFilters
): Promise<ResourceDayStatus[]> {
  // Determine the day
  const date = filters.date;
  const dayOfWeek =
    filters.dayOfWeek ??
    (date ? getDayOfWeek(new Date(date)) : getDayOfWeek(new Date()));

  // Fetch matching resources
  const whereClause: Record<string, unknown> = { isActive: true };
  if (filters.block) whereClause.block = filters.block;
  if (filters.floor) whereClause.floor = filters.floor;
  if (filters.departmentId) whereClause.departmentId = filters.departmentId;
  if (filters.resourceType) whereClause.type = filters.resourceType;
  if (filters.minCapacity) whereClause.capacity = { gte: filters.minCapacity };

  const resources = await prisma.resource.findMany({
    where: whereClause,
    orderBy: [{ block: "asc" }, { floor: "asc" }, { code: "asc" }],
  });

  // Get status for each resource
  const results: ResourceDayStatus[] = [];
  for (const resource of resources) {
    const status = await getResourceDayStatus(resource.id, dayOfWeek, date);
    if (!status) continue;

    // Apply status filter
    if (filters.status && status.status !== filters.status) continue;

    // Apply minimum continuous free duration filter
    if (filters.minContinuousFreeMinutes) {
      const hasSlot = status.continuousFreeSlots.some(
        (slot) => slot.durationMinutes >= filters.minContinuousFreeMinutes!
      );
      if (!hasSlot && status.status !== RESOURCE_STATUS.FULLY_UNUSED) continue;
      if (
        status.status === RESOURCE_STATUS.FULLY_UNUSED &&
        WORKING_HOURS.totalMinutes < filters.minContinuousFreeMinutes
      )
        continue;
    }

    results.push(status);
  }

  return results;
}

// ==========================================
// Find Continuous Availability
// ==========================================

/**
 * Find resources with at least X continuous free minutes.
 */
export async function findContinuousAvailability(params: {
  date?: string;
  dayOfWeek?: string;
  durationMinutes: number;
  capacity?: number;
  resourceType?: string;
  departmentId?: string;
  block?: string;
  floor?: number;
}): Promise<
  (ResourceDayStatus & { matchingSlots: FreeInterval[] })[]
> {
  const allStatuses = await getAllResourcesDayStatus({
    date: params.date,
    dayOfWeek: params.dayOfWeek,
    block: params.block,
    floor: params.floor,
    departmentId: params.departmentId,
    resourceType: params.resourceType,
    minCapacity: params.capacity,
  });

  const results: (ResourceDayStatus & { matchingSlots: FreeInterval[] })[] = [];

  for (const status of allStatuses) {
    let matchingSlots: FreeInterval[];

    if (status.status === RESOURCE_STATUS.FULLY_UNUSED) {
      // Entire day is free
      if (WORKING_HOURS.totalMinutes >= params.durationMinutes) {
        matchingSlots = [
          {
            start: WORKING_HOURS.start,
            end: WORKING_HOURS.end,
            durationMinutes: WORKING_HOURS.totalMinutes,
            durationHours: WORKING_HOURS.totalHours,
          },
        ];
      } else {
        continue;
      }
    } else {
      matchingSlots = status.continuousFreeSlots.filter(
        (slot) => slot.durationMinutes >= params.durationMinutes
      );
      if (matchingSlots.length === 0) continue;
    }

    results.push({ ...status, matchingSlots });
  }

  // Sort by longest available slot first, then by utilization (least used first)
  results.sort((a, b) => {
    const aMax = Math.max(...a.matchingSlots.map((s) => s.durationMinutes));
    const bMax = Math.max(...b.matchingSlots.map((s) => s.durationMinutes));
    if (bMax !== aMax) return bMax - aMax;
    return a.utilizationPercent - b.utilizationPercent;
  });

  return results;
}

// ==========================================
// Weekly Utilization
// ==========================================

/**
 * Get weekly utilization for all resources.
 */
export async function getWeeklyUtilization(
  filters?: { block?: string; floor?: number; departmentId?: string }
): Promise<WeeklyUtilization[]> {
  const whereClause: Record<string, unknown> = { isActive: true };
  if (filters?.block) whereClause.block = filters.block;
  if (filters?.floor) whereClause.floor = filters.floor;
  if (filters?.departmentId) whereClause.departmentId = filters.departmentId;

  const resources = await prisma.resource.findMany({
    where: whereClause,
    include: { department: true },
    orderBy: [{ block: "asc" }, { floor: "asc" }, { code: "asc" }],
  });

  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const results: WeeklyUtilization[] = [];

  for (const resource of resources) {
    const days: WeeklyUtilization["days"] = {};
    let totalUtilization = 0;
    let unusedDays = 0;

    for (const day of weekdays) {
      const status = await getResourceDayStatus(resource.id, day);
      if (status) {
        days[day] = {
          scheduledHours: status.scheduledHours,
          utilizationPercent: status.utilizationPercent,
          status: status.status,
        };
        totalUtilization += status.utilizationPercent;
        if (status.status === RESOURCE_STATUS.FULLY_UNUSED) unusedDays++;
      }
    }

    results.push({
      resourceId: resource.id,
      resourceCode: resource.code,
      resourceName: resource.name,
      departmentCode: resource.department?.code ?? undefined,
      block: resource.block,
      floor: resource.floor,
      days,
      averageUtilization: +(totalUtilization / weekdays.length).toFixed(2),
      unusedDays,
      totalDays: weekdays.length,
    });
  }

  return results;
}

// ==========================================
// Dashboard Summary
// ==========================================

/**
 * Get dashboard summary for a given day.
 */
export async function getDashboardSummary(
  date?: string
): Promise<DashboardSummary> {
  const dayOfWeek = date
    ? getDayOfWeek(new Date(date))
    : getDayOfWeek(new Date());

  const allStatuses = await getAllResourcesDayStatus({
    date,
    dayOfWeek,
  });

  const totalResources = allStatuses.length;
  const fullyUnused = allStatuses.filter(
    (s) => s.status === RESOURCE_STATUS.FULLY_UNUSED
  ).length;
  const partiallyUsed = allStatuses.filter(
    (s) => s.status === RESOURCE_STATUS.PARTIALLY_USED
  ).length;
  const fullyOccupied = allStatuses.filter(
    (s) => s.status === RESOURCE_STATUS.FULLY_OCCUPIED
  ).length;

  const totalUtilization = allStatuses.reduce(
    (sum, s) => sum + s.utilizationPercent,
    0
  );
  const averageUtilization =
    totalResources > 0
      ? +(totalUtilization / totalResources).toFixed(2)
      : 0;

  // Resources available for booking = those with any free time
  const availableForBooking = allStatuses.filter(
    (s) => s.status !== RESOURCE_STATUS.FULLY_OCCUPIED
  ).length;

  // Block-wise
  const blockMap = new Map<string, { total: number; unused: number; utilSum: number }>();
  for (const s of allStatuses) {
    const entry = blockMap.get(s.block) ?? { total: 0, unused: 0, utilSum: 0 };
    entry.total++;
    if (s.status === RESOURCE_STATUS.FULLY_UNUSED) entry.unused++;
    entry.utilSum += s.utilizationPercent;
    blockMap.set(s.block, entry);
  }
  const byBlock = Array.from(blockMap.entries()).map(([block, data]) => ({
    block,
    total: data.total,
    unused: data.unused,
    utilization: +(data.utilSum / data.total).toFixed(2),
  }));

  // Floor-wise
  const floorMap = new Map<number, { total: number; unused: number; utilSum: number }>();
  for (const s of allStatuses) {
    const entry = floorMap.get(s.floor) ?? { total: 0, unused: 0, utilSum: 0 };
    entry.total++;
    if (s.status === RESOURCE_STATUS.FULLY_UNUSED) entry.unused++;
    entry.utilSum += s.utilizationPercent;
    floorMap.set(s.floor, entry);
  }
  const byFloor = Array.from(floorMap.entries())
    .map(([floor, data]) => ({
      floor,
      total: data.total,
      unused: data.unused,
      utilization: +(data.utilSum / data.total).toFixed(2),
    }))
    .sort((a, b) => a.floor - b.floor);

  // Department-wise
  const deptMap = new Map<string, { total: number; unused: number; utilSum: number }>();
  for (const s of allStatuses) {
    const dept = s.departmentCode ?? "Unassigned";
    const entry = deptMap.get(dept) ?? { total: 0, unused: 0, utilSum: 0 };
    entry.total++;
    if (s.status === RESOURCE_STATUS.FULLY_UNUSED) entry.unused++;
    entry.utilSum += s.utilizationPercent;
    deptMap.set(dept, entry);
  }
  const byDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    total: data.total,
    unused: data.unused,
    utilization: +(data.utilSum / data.total).toFixed(2),
  }));

  return {
    totalResources,
    fullyUnused,
    partiallyUsed,
    fullyOccupied,
    averageUtilization,
    availableForBooking,
    byBlock,
    byFloor,
    byDepartment,
  };
}

// ==========================================
// Conflict Detection
// ==========================================

/**
 * Check for schedule conflicts on a specific day.
 * Returns all detected conflicts.
 */
export async function findScheduleConflicts(dayOfWeek?: string) {
  const whereClause: Record<string, unknown> = { isActive: true };
  if (dayOfWeek) whereClause.dayOfWeek = dayOfWeek;

  const schedules = await prisma.schedule.findMany({
    where: whereClause,
    include: {
      resource: true,
      department: true,
      program: true,
      faculty: true,
      subject: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const conflicts: {
    type: string;
    scheduleA: typeof schedules[0];
    scheduleB: typeof schedules[0];
    description: string;
  }[] = [];

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];

      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (!intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;

      // Resource conflict
      if (a.resourceId === b.resourceId) {
        conflicts.push({
          type: "RESOURCE",
          scheduleA: a,
          scheduleB: b,
          description: `${a.resource.code} is double-booked on ${a.dayOfWeek} between ${a.startTime}-${a.endTime} and ${b.startTime}-${b.endTime}`,
        });
      }

      // Faculty conflict
      if (a.facultyId && b.facultyId && a.facultyId === b.facultyId) {
        conflicts.push({
          type: "FACULTY",
          scheduleA: a,
          scheduleB: b,
          description: `${a.faculty?.name ?? "Faculty"} is assigned to two classes on ${a.dayOfWeek} between ${a.startTime}-${a.endTime} and ${b.startTime}-${b.endTime}`,
        });
      }

      // Academic group conflict (same dept + program + year + section)
      if (
        a.departmentId &&
        b.departmentId &&
        a.departmentId === b.departmentId &&
        a.programId === b.programId &&
        a.year === b.year &&
        a.section === b.section &&
        a.resourceId !== b.resourceId
      ) {
        conflicts.push({
          type: "ACADEMIC_GROUP",
          scheduleA: a,
          scheduleB: b,
          description: `${a.department?.code} ${a.program?.name ?? ""} Year ${a.year}${a.section ? ` Sec ${a.section}` : ""} has overlapping classes on ${a.dayOfWeek}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if a new schedule entry would conflict with existing ones.
 */
export async function checkScheduleConflict(params: {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  facultyId?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  year?: number | null;
  section?: string | null;
  excludeScheduleId?: string;
}): Promise<{ hasConflict: boolean; conflicts: string[] }> {
  const conflictMessages: string[] = [];

  const whereBase: Record<string, unknown> = {
    dayOfWeek: params.dayOfWeek,
    isActive: true,
  };
  if (params.excludeScheduleId) {
    whereBase.id = { not: params.excludeScheduleId };
  }

  // Check resource conflict
  const resourceConflicts = await prisma.schedule.findMany({
    where: {
      ...whereBase,
      resourceId: params.resourceId,
    },
    include: { resource: true },
  });

  for (const s of resourceConflicts) {
    if (intervalsOverlap(params.startTime, params.endTime, s.startTime, s.endTime)) {
      conflictMessages.push(
        `${s.resource.code} is already scheduled from ${s.startTime} to ${s.endTime}`
      );
    }
  }

  // Check faculty conflict
  if (params.facultyId) {
    const facultyConflicts = await prisma.schedule.findMany({
      where: {
        ...whereBase,
        facultyId: params.facultyId,
      },
      include: { faculty: true, resource: true },
    });

    for (const s of facultyConflicts) {
      if (intervalsOverlap(params.startTime, params.endTime, s.startTime, s.endTime)) {
        conflictMessages.push(
          `${s.faculty?.name ?? "Faculty"} is already assigned at ${s.resource.code} from ${s.startTime} to ${s.endTime}`
        );
      }
    }
  }

  return {
    hasConflict: conflictMessages.length > 0,
    conflicts: conflictMessages,
  };
}
