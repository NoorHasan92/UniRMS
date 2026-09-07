"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { departmentSchema, type DepartmentInput } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";

export async function getDepartments() {
  return await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function createDepartment(data: DepartmentInput) {
  const session = await requireAdmin();
  
  const parsed = departmentSchema.parse(data);
  
  const existing = await prisma.department.findUnique({
    where: { code: parsed.code },
  });

  if (existing) {
    if (!existing.isActive) {
      // Reactivate
      const dept = await prisma.department.update({
        where: { id: existing.id },
        data: {
          ...parsed,
          isActive: true,
        },
      });
      await logAudit({
        userId: session.user!.id,
        action: "CREATE",
        entityType: "DEPARTMENT",
        entityId: dept.id,
        metadata: { code: dept.code, reactivated: true },
      });
      revalidatePath("/departments");
      return { success: true, department: dept };
    }
    return { success: false, error: "Department code already exists" };
  }

  const dept = await prisma.department.create({
    data: parsed,
  });

  await logAudit({
    userId: session.user!.id,
    action: "CREATE",
    entityType: "DEPARTMENT",
    entityId: dept.id,
    metadata: { code: dept.code },
  });

  revalidatePath("/departments");
  return { success: true, department: dept };
}

export async function updateDepartment(id: string, data: DepartmentInput) {
  const session = await requireAdmin();
  
  const parsed = departmentSchema.parse(data);
  
  const existing = await prisma.department.findUnique({
    where: { code: parsed.code },
  });

  if (existing && existing.id !== id) {
    return { success: false, error: "Department code already exists" };
  }

  const dept = await prisma.department.update({
    where: { id },
    data: parsed,
  });

  await logAudit({
    userId: session.user!.id,
    action: "UPDATE",
    entityType: "DEPARTMENT",
    entityId: dept.id,
    metadata: { code: dept.code, oldCode: existing?.code !== parsed.code ? existing?.code : undefined },
  });

  revalidatePath("/departments");
  return { success: true, department: dept };
}

export async function deleteDepartment(id: string) {
  const session = await requireAdmin();

  // Soft delete
  const dept = await prisma.department.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit({
    userId: session.user!.id,
    action: "DELETE",
    entityType: "DEPARTMENT",
    entityId: dept.id,
    metadata: { code: dept.code },
  });

  revalidatePath("/departments");
  return { success: true };
}
