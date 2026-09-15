import { readFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import {
  previewTimetableFromBuffer,
  commitTimetable,
  activateTimetable,
  archiveTimetable,
  deleteTimetable,
} from "../timetable.service";
import { getAllResourcesDayStatus } from "../availability.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed [${message}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

async function runIntegrationTest() {
  console.log("🧪 Running end-to-end timetable integration test against database...\n");

  try {
    // 1. Get or create CSE department
    let cseDept = await prisma.department.findUnique({
      where: { code: "CSE" },
    });
    if (!cseDept) {
      cseDept = await prisma.department.create({
        data: {
          code: "CSE",
          name: "Computer Science & Engineering",
        },
      });
    }

    // 2. Get or create Admin user for audit logging
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: "Test Admin",
          email: "test.admin@university.edu",
          passwordHash: "dummy-hash",
          role: "ADMIN",
        },
      });
    }

    // 3. Ensure required classrooms exist in DB
    const requiredRooms = [
      { code: "RB-701", roomNumber: "701", name: "CSE Classroom 701", type: "CLASSROOM" as const },
      { code: "RB-702", roomNumber: "702", name: "CSE Classroom 702", type: "CLASSROOM" as const },
      { code: "RB-705", roomNumber: "705", name: "CSE Lab 705", type: "LAB" as const },
      { code: "RB-708", roomNumber: "708", name: "CSE Classroom 708", type: "CLASSROOM" as const },
      { code: "RB-606", roomNumber: "606", name: "CSE Lab 606", type: "LAB" as const },
      { code: "RB-608", roomNumber: "608", name: "CSE Classroom 608", type: "CLASSROOM" as const },
      { code: "LB-506", roomNumber: "506", name: "CSE Lab 506", type: "LAB" as const },
      { code: "LB-507", roomNumber: "507", name: "CSE Lab 507", type: "LAB" as const },
    ];

    for (const r of requiredRooms) {
      await prisma.resource.upsert({
        where: { code: r.code },
        update: {},
        create: {
          code: r.code,
          roomNumber: r.roomNumber,
          name: r.name,
          type: r.type,
          block: r.code.startsWith("RB") ? "RIGHT" : "LEFT",
          floor: parseInt(r.roomNumber[0], 10),
          capacity: 50,
          departmentId: cseDept.id,
        },
      });
    }

    // 4. Read real timetable file buffer
    const filePath = join(process.cwd(), "CSE_Routine_Jul-Dec_2026.xlsx");
    const fileBuffer = readFileSync(filePath);

    // 5. Test Preview
    console.log("▶ Step 1: Previewing CSE Routine...");
    const preview = await previewTimetableFromBuffer(
      fileBuffer,
      "CSE_Routine_Jul-Dec_2026.xlsx",
      cseDept.id
    );

    console.log(`  Sheets: ${preview.sheetsParsed.join(", ")}`);
    console.log(`  Teachers mapped: ${Object.keys(preview.teachersMapped).length}`);
    console.log(`  Resolved entries: ${preview.resolutionSummary.resolvedCount}`);
    console.log(`  Unresolved rooms: ${preview.resolutionSummary.unresolvedResourceCount}`);

    assert(preview.resolutionSummary.resolvedCount >= 200, "Resolved >= 200 slots");
    assert(Object.keys(preview.teachersMapped).length >= 25, "Mapped >= 25 teachers");

    // 6. Test Commit as ACTIVE
    console.log("\n▶ Step 2: Committing Timetable as ACTIVE...");
    const timetable = await commitTimetable({
      departmentId: cseDept.id,
      name: "CSE Routine Jul-Dec 2026 (Integration Test)",
      academicPeriod: "Jul-Dec 2026",
      sourceFileName: "CSE_Routine_Jul-Dec_2026.xlsx",
      timetableStatus: "ACTIVE",
      importedById: adminUser.id,
      resolvedEntries: preview.resolutionSummary.resolvedEntries,
      metadata: {
        sheetsParsed: preview.sheetsParsed,
      },
    });

    console.log(`  Created Timetable ID: ${timetable.id}`);
    assertEqual(timetable.timetableStatus, "ACTIVE", "Timetable status is ACTIVE");
    assert(timetable.recordsImported >= 200, "recordsImported >= 200");

    // Verify Schedules in DB
    const schedulesInDb = await prisma.schedule.findMany({
      where: { timetableId: timetable.id },
      include: { resource: true },
    });
    console.log(`  Schedules inserted into DB: ${schedulesInDb.length}`);
    assertEqual(schedulesInDb.length, timetable.recordsImported, "All schedules stored in DB");

    // Check that schedule records have merged cell metadata
    const mergedSchedule = schedulesInDb.find(
      (s) => s.sourceStartCol !== null && s.sourceEndCol !== null && s.sourceEndCol > s.sourceStartCol
    );
    assert(!!mergedSchedule, "Found merged schedule with multi-column span");
    console.log(
      `  Verified multi-hour merged class: ${mergedSchedule?.subjectCode} (${mergedSchedule?.startTime} - ${mergedSchedule?.endTime}) in ${mergedSchedule?.resource.code}`
    );

    // 7. Verify Availability Engine integration
    console.log("\n▶ Step 3: Verifying Availability Engine reads the new schedules...");
    const statuses = await getAllResourcesDayStatus({
      dayOfWeek: "MONDAY",
    });

    const rb705Status = statuses.find((s) => s.resourceCode === "RB-705");
    assert(!!rb705Status, "RB-705 found in availability statuses");
    console.log(`  RB-705 Monday status: ${rb705Status?.status}`);
    console.log(`  RB-705 Monday occupied slots: ${rb705Status?.occupiedIntervals.length}`);
    assert(
      (rb705Status?.occupiedIntervals.length || 0) > 0,
      "RB-705 has occupied intervals from imported timetable"
    );

    // 8. Test Versioning: Archive
    console.log("\n▶ Step 4: Testing Archive Timetable...");
    await archiveTimetable(timetable.id, adminUser.id);

    const archivedTimetable = await prisma.timetable.findUnique({
      where: { id: timetable.id },
    });
    assertEqual(archivedTimetable?.timetableStatus, "ARCHIVED", "Status is ARCHIVED");

    const activeSchedulesCount = await prisma.schedule.count({
      where: { timetableId: timetable.id, isActive: true },
    });
    assertEqual(activeSchedulesCount, 0, "All schedules deactivated upon archiving");

    // 9. Test Versioning: Re-activate
    console.log("\n▶ Step 5: Testing Re-activate Timetable...");
    await activateTimetable(timetable.id, adminUser.id);

    const reactivated = await prisma.timetable.findUnique({
      where: { id: timetable.id },
    });
    assertEqual(reactivated?.timetableStatus, "ACTIVE", "Status is ACTIVE again");

    const reactivatedSchedulesCount = await prisma.schedule.count({
      where: { timetableId: timetable.id, isActive: true },
    });
    assertEqual(reactivatedSchedulesCount, schedulesInDb.length, "All schedules reactivated");

    // 10. Clean up: Delete test timetable
    console.log("\n▶ Step 6: Cleaning up test timetable...");
    await deleteTimetable(timetable.id, adminUser.id);

    const checkDeleted = await prisma.timetable.findUnique({
      where: { id: timetable.id },
    });
    assertEqual(checkDeleted, null, "Timetable deleted from DB");

    const checkSchedulesDeleted = await prisma.schedule.count({
      where: { timetableId: timetable.id },
    });
    assertEqual(checkSchedulesDeleted, 0, "All schedules cascade-deleted");

    console.log("\n🎉 END-TO-END INTEGRATION TEST COMPLETED SUCCESSFULLY!");
  } finally {
    await prisma.$disconnect();
  }
}

runIntegrationTest().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
