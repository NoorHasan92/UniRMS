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

function normalizeDayOfWeek(day: string): string {
  if (!day) return "";
  const d = day.trim().toUpperCase();
  if (d.startsWith("MON")) return "MONDAY";
  if (d.startsWith("TUE")) return "TUESDAY";
  if (d.startsWith("WED")) return "WEDNESDAY";
  if (d.startsWith("THU")) return "THURSDAY";
  if (d.startsWith("FRI")) return "FRIDAY";
  if (d.startsWith("SAT")) return "SATURDAY";
  return d;
}

function normalizeTime(time: string): string {
  if (!time) return "";
  const t = time.trim();
  const match12h = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = match12h[2];
    const modifier = match12h[3]?.toUpperCase();
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  return t;
}

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const resourceCode = row.resourceCode?.trim().toUpperCase();
      if (!resourceCode) throw new Error(`Row ${i + 1}: Resource/Room code is required`);

      const dayOfWeek = normalizeDayOfWeek(row.dayOfWeek);
      if (!dayOfWeek) throw new Error(`Row ${i + 1}: Day of week is required`);

      const startTime = normalizeTime(row.startTime);
      const endTime = normalizeTime(row.endTime);
      if (!startTime || !endTime) throw new Error(`Row ${i + 1}: Start time and end time are required`);

      // 1. Resolve Resource
      const resource = await prisma.resource.findUnique({
        where: { code: resourceCode },
      });
      if (!resource) throw new Error(`Row ${i + 1}: Resource ${resourceCode} not found in database`);

      // 2. Resolve other entities (Subject, Faculty, Program)
      const subjectCode = row.subjectCode?.trim().toUpperCase();
      const facultyCode = row.facultyCode?.trim();
      const programCode = row.programCode?.trim().toUpperCase();

      const subject = subjectCode ? await prisma.subject.findFirst({ where: { code: subjectCode } }) : null;
      const faculty = facultyCode
        ? await prisma.faculty.findFirst({
            where: {
              OR: [
                { shortCode: facultyCode },
                { name: { contains: facultyCode, mode: "insensitive" } },
              ],
            },
          })
        : null;
      const program = programCode ? await prisma.program.findUnique({ where: { code: programCode } }) : null;

      const semester = row.semester ? parseInt(String(row.semester).replace(/\D/g, "")) : null;
      const year = semester ? SEMESTER_TO_YEAR[semester as keyof typeof SEMESTER_TO_YEAR] || null : null;
      const section = row.section ? String(row.section).trim().toUpperCase() : null;

      // 3. Conflict Check
      const conflictCheck = await checkScheduleConflict({
        dayOfWeek: dayOfWeek as any,
        startTime,
        endTime,
        resourceId: resource.id,
        facultyId: faculty?.id,
        departmentId: resource.departmentId,
        programId: program?.id,
        year,
        section,
      });

      if (conflictCheck.hasConflict) {
        throw new Error(`Row ${i + 1}: Conflict detected - ${conflictCheck.conflicts.join(", ")}`);
      }

      // 4. Create Schedule
      await prisma.schedule.create({
        data: {
          dayOfWeek: dayOfWeek as any,
          startTime,
          endTime,
          resourceId: resource.id,
          departmentId: resource.departmentId,
          programId: program?.id,
          year,
          section,
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
