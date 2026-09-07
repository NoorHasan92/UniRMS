"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resourceSchema, type ResourceInput } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";

export async function getResources() {
  return await prisma.resource.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: [
      { block: "asc" },
      { floor: "asc" },
      { code: "asc" },
    ],
  });
}

export async function createResource(data: ResourceInput) {
  const session = await requireAdmin();
  
  const parsed = resourceSchema.parse(data);
  
  const existing = await prisma.resource.findUnique({
    where: { code: parsed.code },
  });

  if (existing) {
    if (!existing.isActive) {
      const res = await prisma.resource.update({
        where: { id: existing.id },
        data: {
          ...parsed,
          isActive: true,
        },
      });
      await logAudit({
        userId: session.user!.id,
        action: "CREATE",
        entityType: "RESOURCE",
        entityId: res.id,
        metadata: { code: res.code, reactivated: true },
      });
      revalidatePath("/resources");
      return { success: true, resource: res };
    }
    return { success: false, error: "Resource code already exists" };
  }

  const res = await prisma.resource.create({
    data: parsed,
  });

  await logAudit({
    userId: session.user!.id,
    action: "CREATE",
    entityType: "RESOURCE",
    entityId: res.id,
    metadata: { code: res.code },
  });

  revalidatePath("/resources");
  return { success: true, resource: res };
}

export async function updateResource(id: string, data: ResourceInput) {
  const session = await requireAdmin();
  
  const parsed = resourceSchema.parse(data);
  
  const existing = await prisma.resource.findUnique({
    where: { code: parsed.code },
  });

  if (existing && existing.id !== id) {
    return { success: false, error: "Resource code already exists" };
  }

  const res = await prisma.resource.update({
    where: { id },
    data: parsed,
  });

  await logAudit({
    userId: session.user!.id,
    action: "UPDATE",
    entityType: "RESOURCE",
    entityId: res.id,
    metadata: { code: res.code },
  });

  revalidatePath(`/resources/${id}`);
  revalidatePath("/resources");
  return { success: true, resource: res };
}

export async function deleteResource(id: string) {
  const session = await requireAdmin();

  // Soft delete
  const res = await prisma.resource.update({
    where: { id },
    data: { isActive: false },
  });

  // Soft delete related active schedules and bookings if required,
  // For MVP, just soft deleting the resource is fine, it will be excluded from queries.

  await logAudit({
    userId: session.user!.id,
    action: "DELETE",
    entityType: "RESOURCE",
    entityId: res.id,
    metadata: { code: res.code },
  });

  revalidatePath("/resources");
  return { success: true };
}
