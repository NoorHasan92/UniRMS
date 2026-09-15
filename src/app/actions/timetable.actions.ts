"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-utils";
import { TimetableStatus } from "@prisma/client";
import {
  getTimetables,
  getTimetableById,
  previewTimetableFromBuffer,
  commitTimetable,
  activateTimetable,
  archiveTimetable,
  deleteTimetable,
  CommitTimetableInput,
} from "@/lib/services/timetable.service";

/**
 * Server action to fetch list of timetables.
 */
export async function getTimetablesAction(departmentId?: string, status?: TimetableStatus) {
  try {
    return await getTimetables({ departmentId, status });
  } catch (error: any) {
    console.error("Failed to fetch timetables:", error);
    throw new Error(error.message || "Failed to fetch timetables");
  }
}

/**
 * Server action to fetch a single timetable by ID.
 */
export async function getTimetableByIdAction(id: string) {
  try {
    return await getTimetableById(id);
  } catch (error: any) {
    console.error("Failed to fetch timetable:", error);
    throw new Error(error.message || "Failed to fetch timetable");
  }
}

/**
 * Server action to preview and validate a timetable file before committing.
 */
export async function previewTimetableAction(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  const departmentId = formData.get("departmentId") as string | null;

  if (!file) {
    return { success: false, error: "Please select a timetable spreadsheet (.xlsx)." };
  }

  if (!departmentId) {
    return { success: false, error: "Please select an academic department." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await previewTimetableFromBuffer(buffer, file.name, departmentId);
    return { success: true, preview };
  } catch (error: any) {
    console.error("Preview failed:", error);
    return { success: false, error: error.message || "Failed to parse timetable spreadsheet." };
  }
}

/**
 * Server action to commit a validated timetable to the database.
 */
export async function commitTimetableAction(payload: {
  departmentId: string;
  name: string;
  academicPeriod: string;
  sourceFileName: string;
  timetableStatus?: TimetableStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  resolvedEntries: any[];
  metadata?: any;
}) {
  const session = await requireAdmin();

  try {
    const timetable = await commitTimetable({
      departmentId: payload.departmentId,
      name: payload.name,
      academicPeriod: payload.academicPeriod,
      sourceFileName: payload.sourceFileName,
      timetableStatus: payload.timetableStatus || "ACTIVE",
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : null,
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
      importedById: session.user?.id as string,
      resolvedEntries: payload.resolvedEntries,
      metadata: payload.metadata,
    });

    revalidatePath("/admin/timetables");
    revalidatePath("/admin/timetable-import");
    revalidatePath("/admin/resources");
    revalidatePath("/admin/schedules");
    revalidatePath("/schedule");
    revalidatePath("/");

    return { success: true, timetableId: timetable.id };
  } catch (error: any) {
    console.error("Commit failed:", error);
    return { success: false, error: error.message || "Failed to commit timetable to database." };
  }
}

/**
 * Server action to activate a timetable.
 */
export async function activateTimetableAction(timetableId: string) {
  const session = await requireAdmin();

  try {
    await activateTimetable(timetableId, session.user?.id as string);

    revalidatePath("/admin/timetables");
    revalidatePath("/admin/resources");
    revalidatePath("/admin/schedules");
    revalidatePath("/schedule");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Activation failed:", error);
    return { success: false, error: error.message || "Failed to activate timetable." };
  }
}

/**
 * Server action to archive a timetable.
 */
export async function archiveTimetableAction(timetableId: string) {
  const session = await requireAdmin();

  try {
    await archiveTimetable(timetableId, session.user?.id as string);

    revalidatePath("/admin/timetables");
    revalidatePath("/admin/resources");
    revalidatePath("/admin/schedules");
    revalidatePath("/schedule");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Archive failed:", error);
    return { success: false, error: error.message || "Failed to archive timetable." };
  }
}

/**
 * Server action to delete a timetable.
 */
export async function deleteTimetableAction(timetableId: string) {
  const session = await requireAdmin();

  try {
    await deleteTimetable(timetableId, session.user?.id as string);

    revalidatePath("/admin/timetables");
    revalidatePath("/admin/resources");
    revalidatePath("/admin/schedules");
    revalidatePath("/schedule");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Delete failed:", error);
    return { success: false, error: error.message || "Failed to delete timetable." };
  }
}

// ----------------------------------------------------
// Backward compatibility exports
// ----------------------------------------------------
export async function getTimetableImports() {
  return await getTimetables();
}

export async function processTimetableImport(data: any[], filename: string) {
  throw new Error(
    "Deprecated: processTimetableImport is replaced by the deterministic previewTimetableAction and commitTimetableAction."
  );
}
