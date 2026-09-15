import prisma from "@/lib/prisma";
import { TimetableStatus, Prisma } from "@prisma/client";
import { parseTimetableWorkbook } from "./timetable-parser";
import {
  resolveTimetableEntries,
  ResolvedTimetableEntry,
  TimetableResolutionSummary,
} from "./timetable-resolver";
import { logAudit } from "./audit.service";

export interface CommitTimetableInput {
  departmentId: string;
  name: string;
  academicPeriod: string;
  sourceFileName: string;
  timetableStatus?: TimetableStatus;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  importedById: string;
  resolvedEntries: ResolvedTimetableEntry[];
  metadata?: Record<string, any>;
}

export interface TimetablePreviewResult {
  fileName: string;
  departmentId: string;
  departmentName: string;
  sheetsParsed: string[];
  teachersMapped: Record<string, string>;
  resolutionSummary: TimetableResolutionSummary;
}

/**
 * Retrieves all timetables with associated department, importedBy user, and schedule counts.
 */
export async function getTimetables(filter?: {
  departmentId?: string;
  status?: TimetableStatus;
}) {
  const where: Prisma.TimetableWhereInput = {};
  if (filter?.departmentId) where.departmentId = filter.departmentId;
  if (filter?.status) where.timetableStatus = filter.status;

  return await prisma.timetable.findMany({
    where,
    include: {
      department: { select: { id: true, code: true, name: true } },
      importedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { schedules: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single timetable by ID with detailed relations and metadata.
 */
export async function getTimetableById(id: string) {
  return await prisma.timetable.findUnique({
    where: { id },
    include: {
      department: true,
      importedBy: { select: { id: true, name: true, email: true } },
      schedules: {
        include: {
          resource: true,
          faculty: true,
          subject: true,
          program: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });
}

/**
 * Previews and resolves a timetable spreadsheet buffer without writing changes to DB.
 */
export async function previewTimetableFromBuffer(
  buffer: Buffer,
  fileName: string,
  departmentId: string
): Promise<TimetablePreviewResult> {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    throw new Error(`Department with ID "${departmentId}" not found.`);
  }

  // 1. Parse workbook with merge-aware engine
  const parsed = parseTimetableWorkbook(buffer);

  // 2. Load registered entities for resolution
  const [resources, faculty, subjects, programs, existingSchedules] = await Promise.all([
    prisma.resource.findMany({
      where: { isActive: true },
      select: { id: true, code: true, roomNumber: true, name: true, type: true, departmentId: true },
    }),
    prisma.faculty.findMany({
      where: { isActive: true },
      select: { id: true, name: true, shortCode: true, departmentId: true },
    }),
    prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, departmentId: true },
    }),
    prisma.program.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, departmentId: true },
    }),
    prisma.schedule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        resourceId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        timetableId: true,
        subjectCode: true,
        semesterLabel: true,
      },
    }),
  ]);

  // 3. Resolve entities and detect conflicts
  const resolutionSummary = resolveTimetableEntries(parsed.entries, {
    resources,
    faculty,
    subjects,
    programs,
    existingSchedules,
    teachersMap: parsed.teachers,
  });

  const teachersMapped: Record<string, string> = {};
  parsed.teachers.forEach((val, key) => {
    teachersMapped[key] = val;
  });

  return {
    fileName,
    departmentId: department.id,
    departmentName: department.name,
    sheetsParsed: parsed.sheetsParsed,
    teachersMapped,
    resolutionSummary,
  };
}

/**
 * Commits a resolved timetable and its schedule records in an atomic database transaction.
 */
export async function commitTimetable(input: CommitTimetableInput) {
  const {
    departmentId,
    name,
    academicPeriod,
    sourceFileName,
    timetableStatus = "ACTIVE",
    effectiveFrom,
    effectiveTo,
    importedById,
    resolvedEntries,
    metadata = {},
  } = input;

  const validEntries = resolvedEntries.filter(
    (e) => e.status === "RESOLVED" && e.resourceId
  );

  if (validEntries.length === 0) {
    throw new Error("Cannot commit timetable: No valid resolved classroom entries were found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // If activating, archive existing active timetables for this department
    if (timetableStatus === "ACTIVE") {
      const activeTimetables = await tx.timetable.findMany({
        where: { departmentId, timetableStatus: "ACTIVE" },
        select: { id: true },
      });

      if (activeTimetables.length > 0) {
        const activeIds = activeTimetables.map((t) => t.id);
        await tx.timetable.updateMany({
          where: { id: { in: activeIds } },
          data: { timetableStatus: "ARCHIVED" },
        });

        await tx.schedule.updateMany({
          where: { timetableId: { in: activeIds } },
          data: { isActive: false },
        });
      }
    }

    // Create Timetable record
    const timetable = await tx.timetable.create({
      data: {
        departmentId,
        name,
        academicPeriod,
        sourceFileName,
        timetableStatus,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        importedById,
        recordsImported: validEntries.length,
        recordsFailed: resolvedEntries.length - validEntries.length,
        metadata: {
          ...metadata,
          committedAt: new Date().toISOString(),
        },
      },
    });

    // Bulk create schedules
    const scheduleData = validEntries.map((e) => ({
      timetableId: timetable.id,
      dayOfWeek: e.entry.dayOfWeek,
      startTime: e.entry.startTime,
      endTime: e.entry.endTime,
      resourceId: e.resourceId as string,
      departmentId,
      programId: e.programId || null,
      year: e.year || null,
      section: e.section || null,
      semesterLabel: e.entry.semesterLabel || null,
      classType: e.entry.classType || "LECTURE",
      subjectId: e.subjectId || null,
      subjectCode: e.entry.subjectCode || null,
      subjectName: e.subjectName || null,
      facultyId: e.facultyId || null,
      facultyCode: e.entry.facultyCodes.join(", ") || null,
      sourceRow: e.entry.sourceRow,
      sourceStartCol: e.entry.sourceStartCol,
      sourceEndCol: e.entry.sourceEndCol,
      isActive: timetableStatus === "ACTIVE",
    }));

    await tx.schedule.createMany({
      data: scheduleData,
    });

    return timetable;
  });

  await logAudit({
    userId: importedById,
    action: "IMPORT",
    entityType: "TIMETABLE",
    entityId: result.id,
    metadata: {
      name,
      departmentId,
      academicPeriod,
      recordsImported: validEntries.length,
      timetableStatus,
    },
  });

  return result;
}

/**
 * Activates a timetable, making its schedules live and archiving previously active ones.
 */
export async function activateTimetable(timetableId: string, userId: string) {
  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
    include: { department: true },
  });

  if (!timetable) throw new Error("Timetable not found");

  await prisma.$transaction(async (tx) => {
    // 1. Archive other active timetables for this department
    const currentActives = await tx.timetable.findMany({
      where: {
        departmentId: timetable.departmentId,
        timetableStatus: "ACTIVE",
        id: { not: timetableId },
      },
      select: { id: true },
    });

    if (currentActives.length > 0) {
      const activeIds = currentActives.map((t) => t.id);
      await tx.timetable.updateMany({
        where: { id: { in: activeIds } },
        data: { timetableStatus: "ARCHIVED" },
      });
      await tx.schedule.updateMany({
        where: { timetableId: { in: activeIds } },
        data: { isActive: false },
      });
    }

    // 2. Set this timetable to ACTIVE
    await tx.timetable.update({
      where: { id: timetableId },
      data: { timetableStatus: "ACTIVE" },
    });

    // 3. Set all its schedules to active
    await tx.schedule.updateMany({
      where: { timetableId },
      data: { isActive: true },
    });
  });

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "TIMETABLE",
    entityId: timetableId,
    metadata: {
      action: "ACTIVATE",
      departmentId: timetable.departmentId,
      name: timetable.name,
    },
  });

  return { success: true };
}

/**
 * Archives an active or draft timetable, deactivating all its schedules.
 */
export async function archiveTimetable(timetableId: string, userId: string) {
  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
  });
  if (!timetable) throw new Error("Timetable not found");

  await prisma.$transaction([
    prisma.timetable.update({
      where: { id: timetableId },
      data: { timetableStatus: "ARCHIVED" },
    }),
    prisma.schedule.updateMany({
      where: { timetableId },
      data: { isActive: false },
    }),
  ]);

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "TIMETABLE",
    entityId: timetableId,
    metadata: {
      action: "ARCHIVE",
      name: timetable.name,
    },
  });

  return { success: true };
}

/**
 * Deletes a timetable and all its associated schedule records (cascade).
 */
export async function deleteTimetable(timetableId: string, userId: string) {
  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
  });
  if (!timetable) throw new Error("Timetable not found");

  await prisma.timetable.delete({
    where: { id: timetableId },
  });

  await logAudit({
    userId,
    action: "DELETE",
    entityType: "TIMETABLE",
    entityId: timetableId,
    metadata: {
      name: timetable.name,
      departmentId: timetable.departmentId,
    },
  });

  return { success: true };
}
