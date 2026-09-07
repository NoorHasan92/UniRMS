"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { maintenanceBlockSchema, type MaintenanceBlockInput } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";

export async function getMaintenanceBlocks() {
  return await prisma.maintenanceBlock.findMany({
    include: {
      resource: true,
    },
    orderBy: { startDate: "asc" },
  });
}

export async function createMaintenanceBlock(data: MaintenanceBlockInput) {
  const session = await requireAdmin();
  
  const parsed = maintenanceBlockSchema.parse(data);

  // Validate dates
  const startDate = new Date(parsed.startDate);
  const endDate = new Date(parsed.endDate);

  if (endDate < startDate) {
    return { success: false, error: "End date must be after or equal to start date" };
  }

  const block = await prisma.maintenanceBlock.create({
    data: {
      ...parsed,
      startDate,
      endDate,
      createdById: session.user?.id,
    },
    include: { resource: true },
  });

  await logAudit({
    userId: session.user?.id as string,
    action: "CREATE",
    entityType: "MAINTENANCE_BLOCK",
    entityId: block.id,
    metadata: { 
      resource: block.resource.code, 
      startDate: parsed.startDate, 
      endDate: parsed.endDate 
    },
  });

  revalidatePath("/maintenance");
  revalidatePath("/availability");
  revalidatePath("/");
  return { success: true, block };
}

export async function deleteMaintenanceBlock(id: string) {
  const session = await requireAdmin();

  const block = await prisma.maintenanceBlock.delete({
    where: { id },
    include: { resource: true },
  });

  await logAudit({
    userId: session.user?.id as string,
    action: "DELETE",
    entityType: "MAINTENANCE_BLOCK",
    entityId: id,
    metadata: { 
      resource: block.resource.code, 
      startDate: block.startDate.toISOString(), 
      endDate: block.endDate.toISOString() 
    },
  });

  revalidatePath("/maintenance");
  revalidatePath("/availability");
  revalidatePath("/");
  return { success: true };
}
