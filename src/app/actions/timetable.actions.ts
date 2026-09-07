"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-utils";
import { logAudit } from "@/lib/services/audit.service";
import { checkScheduleConflict } from "@/lib/services/availability.service";
import { SEMESTER_TO_YEAR } from "@/lib/constants";

// Helper function to extract or create entities during import
async function getOrCreateEntity(type: string, name: string, code: string, departmentId?: string) {
  // Simplified for MVP. In reality, you'd want more robust matching.
  return null; // Not fully implemented yet
}

export async function getTimetableImports() {
  return await prisma.timetableImport.findMany({
    include: {
      importedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function processTimetableImport(data: any[], filename: string) {
  const session = await requireAdmin();

  // Create import record
  const importRecord = await prisma.timetableImport.create({
    data: {
      filename,
      status: "PROCESSING",
      importedById: session.user?.id as string,
    },
  });

  let recordsImported = 0;
  let recordsFailed = 0;
  const errors: string[] = [];

  // Assuming data is an array of objects: 
  // { dayOfWeek, startTime, endTime, resourceCode, subjectCode, facultyCode, programCode, semester, section }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // 1. Resolve Resource
      const resource = await prisma.resource.findUnique({
        where: { code: row.resourceCode },
      });
      if (!resource) throw new Error(`Row ${i+1}: Resource ${row.resourceCode} not found`);

      // 2. Resolve other entities (Subject, Faculty, Program)
      // For MVP, we'll assume they exist or we just link by code if they do.
      // This is a simplified version.
      const subject = row.subjectCode ? await prisma.subject.findFirst({ where: { code: row.subjectCode } }) : null;
      const faculty = row.facultyCode ? await prisma.faculty.findFirst({ where: { shortCode: row.facultyCode } }) : null;
      const program = row.programCode ? await prisma.program.findUnique({ where: { code: row.programCode } }) : null;

      const year = row.semester ? SEMESTER_TO_YEAR[parseInt(row.semester) as keyof typeof SEMESTER_TO_YEAR] || null : null;

      // 3. Conflict Check
      const conflictCheck = await checkScheduleConflict({
        dayOfWeek: row.dayOfWeek.toUpperCase(),
        startTime: row.startTime,
        endTime: row.endTime,
        resourceId: resource.id,
        facultyId: faculty?.id,
        departmentId: resource.departmentId,
        programId: program?.id,
        year,
        section: row.section || null,
      });

      if (conflictCheck.hasConflict) {
        throw new Error(`Row ${i+1}: Conflict detected - ${conflictCheck.conflicts.join(", ")}`);
      }

      // 4. Create Schedule
      await prisma.schedule.create({
        data: {
          dayOfWeek: row.dayOfWeek.toUpperCase() as any,
          startTime: row.startTime,
          endTime: row.endTime,
          resourceId: resource.id,
          departmentId: resource.departmentId,
          programId: program?.id,
          year,
          section: row.section || null,
          subjectId: subject?.id,
          facultyId: faculty?.id,
          timetableImportId: importRecord.id,
        },
      });

      recordsImported++;
    } catch (err: any) {
      recordsFailed++;
      errors.push(err.message);
    }
  }

  // Update import record status
  await prisma.timetableImport.update({
    where: { id: importRecord.id },
    data: {
      status: recordsFailed === 0 ? "COMPLETED" : (recordsImported === 0 ? "FAILED" : "COMPLETED"),
      recordsImported,
      recordsFailed,
      metadata: { errors: errors.slice(0, 100) }, // store up to 100 errors
    },
  });

  await logAudit({
    userId: session.user?.id as string,
    action: "IMPORT",
    entityType: "TIMETABLE_IMPORT",
    entityId: importRecord.id,
    metadata: { filename, recordsImported, recordsFailed },
  });

  revalidatePath("/admin/timetable-import");
  revalidatePath("/schedules");
  return { success: true, recordsImported, recordsFailed, errors };
}
