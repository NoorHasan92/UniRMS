/**
 * Audit logging service.
 * Tracks important actions for accountability.
 */

import prisma from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "CANCEL"
  | "LOGIN";

export type AuditEntityType =
  | "RESOURCE"
  | "SCHEDULE"
  | "BOOKING"
  | "DEPARTMENT"
  | "PROGRAM"
  | "FACULTY"
  | "SUBJECT"
  | "USER"
  | "TIMETABLE_IMPORT"
  | "MAINTENANCE_BLOCK";

/**
 * Log an audit event.
 */
export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Get recent audit logs with pagination.
 */
export async function getAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  userId?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  const whereClause: Record<string, unknown> = {};
  if (params?.entityType) whereClause.entityType = params.entityType;
  if (params?.userId) whereClause.userId = params.userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
    }),
    prisma.auditLog.count({ where: whereClause }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
