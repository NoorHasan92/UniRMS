"use server";

import { findContinuousAvailability, getAllResourcesDayStatus } from "@/lib/services/availability.service";
import { type AvailabilitySearchInput } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";

export async function searchAvailability(data: AvailabilitySearchInput) {
  await requireAuth();

  if (data.minContinuousFreeMinutes) {
    return await findContinuousAvailability({
      date: data.date,
      dayOfWeek: data.dayOfWeek,
      durationMinutes: data.minContinuousFreeMinutes,
      capacity: data.minCapacity,
      resourceType: data.resourceType,
      departmentId: data.departmentId,
      block: data.block,
      floor: data.floor,
    });
  } else {
    if (data.status === "AVAILABLE") {
      const all = await getAllResourcesDayStatus({
        date: data.date,
        dayOfWeek: data.dayOfWeek,
        block: data.block,
        floor: data.floor,
        departmentId: data.departmentId,
        resourceType: data.resourceType,
        minCapacity: data.minCapacity,
      });
      return all.filter((r) => r.status !== "FULLY_OCCUPIED");
    }

    return await getAllResourcesDayStatus({
      date: data.date,
      dayOfWeek: data.dayOfWeek,
      block: data.block,
      floor: data.floor,
      departmentId: data.departmentId,
      resourceType: data.resourceType,
      status: data.status as any,
      minCapacity: data.minCapacity,
    });
  }
}
