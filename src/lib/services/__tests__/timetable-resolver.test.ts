import { readFileSync } from "fs";
import { join } from "path";
import { parseTimetableWorkbook } from "../timetable-parser";
import {
  normalizeRoomCode,
  matchResource,
  parseSemesterLabel,
  resolveTimetableEntries,
  doTimesOverlap,
  ResolvableResource,
} from "../timetable-resolver";
import { DayOfWeek } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed [${message}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function runTests() {
  console.log("🧪 Running timetable resolver test suite...\n");
  let passed = 0;

  // ----------------------------------------------------
  // Test 1: normalizeRoomCode
  // ----------------------------------------------------
  console.log("▶ Testing normalizeRoomCode...");
  assertEqual(normalizeRoomCode("RB-705"), "RB705", "RB-705 normalized");
  assertEqual(normalizeRoomCode("rb705"), "RB705", "lowercase normalized");
  assertEqual(normalizeRoomCode("608"), "608", "608 normalized");
  assertEqual(normalizeRoomCode("Lab -606"), "606", "Lab -606 normalized");
  assertEqual(normalizeRoomCode("RB 702"), "RB702", "RB 702 normalized");
  passed++;

  // ----------------------------------------------------
  // Test 2: matchResource
  // ----------------------------------------------------
  console.log("▶ Testing matchResource...");
  const mockResources: ResolvableResource[] = [
    { id: "res-705", code: "RB-705", roomNumber: "705", name: "CSE Lab 705", type: "LAB", block: "RIGHT" },
    { id: "res-702", code: "RB-702", roomNumber: "702", name: "CSE Classroom 702", type: "CLASSROOM", block: "RIGHT" },
    { id: "res-608", code: "RB-608", roomNumber: "608", name: "CSE Classroom 608", type: "CLASSROOM", block: "RIGHT" },
    { id: "res-606", code: "RB-606", roomNumber: "606", name: "CSE Lab 606", type: "LAB", block: "RIGHT" },
    { id: "res-cb-606", code: "CB-606", roomNumber: "606", name: "CSE Lab 606", type: "LAB", block: "CENTRAL" },
    { id: "res-cb-708", code: "CB-708", roomNumber: "708", name: "CSE Lab 708", type: "LAB", block: "CENTRAL" },
    { id: "res-cb-608", code: "CB-608", roomNumber: "608", name: "CSE Lab 608", type: "LAB", block: "CENTRAL" },
  ];

  const m1 = matchResource("RB705", mockResources);
  assertEqual(m1?.id, "res-705", "matches RB705 to res-705");
  passed++;

  const m2 = matchResource("RB-608", mockResources);
  assertEqual(m2?.id, "res-608", "matches RB-608 to res-608");
  passed++;

  // Un-prefixed lab must match CENTRAL block lab:
  const m3 = matchResource("Lab -606", mockResources);
  assertEqual(m3?.id, "res-cb-606", "matches un-prefixed Lab -606 to Central Block res-cb-606");
  passed++;

  const m3b = matchResource("708", mockResources, { isLab: true });
  assertEqual(m3b?.id, "res-cb-708", "matches un-prefixed 708 lab to Central Block res-cb-708");
  passed++;

  const m4 = matchResource("NONEXISTENT", mockResources);
  assertEqual(m4, null, "returns null for unknown room");
  passed++;

  // ----------------------------------------------------
  // Test 3: parseSemesterLabel
  // ----------------------------------------------------
  console.log("▶ Testing parseSemesterLabel...");
  const s1 = parseSemesterLabel("1st MCA");
  assertEqual(s1.year, 1, "1st MCA year 1");
  assertEqual(s1.programCode, "MCA", "1st MCA program MCA");
  passed++;

  const s2 = parseSemesterLabel("7th CSE");
  assertEqual(s2.year, 4, "7th CSE year 4");
  assertEqual(s2.programCode, "BTECH", "7th CSE program BTECH");
  passed++;

  const s3 = parseSemesterLabel("1st CSE (SecB)");
  assertEqual(s3.year, 1, "1st CSE year 1");
  assertEqual(s3.section, "B", "1st CSE section B");
  assertEqual(s3.programCode, "BTECH", "1st CSE program BTECH");
  passed++;

  // ----------------------------------------------------
  // Test 4: doTimesOverlap
  // ----------------------------------------------------
  console.log("▶ Testing doTimesOverlap...");
  assert(doTimesOverlap("10:00", "12:00", "11:00", "13:00"), "overlapping intervals");
  assert(!doTimesOverlap("10:00", "11:00", "11:00", "12:00"), "adjacent intervals do not overlap");
  assert(!doTimesOverlap("10:00", "11:00", "12:00", "13:00"), "disjoint intervals do not overlap");
  passed++;

  // ----------------------------------------------------
  // Test 5: Full Resolution against Routine Workbook
  // ----------------------------------------------------
  console.log("▶ Testing resolveTimetableEntries with parsed routine workbook...");

  const allResources: ResolvableResource[] = [
    { id: "1", code: "RB-701", roomNumber: "701", name: "CSE Classroom 701", type: "CLASSROOM" },
    { id: "2", code: "RB-702", roomNumber: "702", name: "CSE Classroom 702", type: "CLASSROOM" },
    { id: "3", code: "RB-703", roomNumber: "703", name: "ECE Classroom 703", type: "CLASSROOM" },
    { id: "4", code: "RB-704", roomNumber: "704", name: "ECE Lab 704", type: "LAB" },
    { id: "5", code: "RB-705", roomNumber: "705", name: "CSE Lab 705", type: "LAB" },
    { id: "6", code: "RB-706", roomNumber: "706", name: "CSE Classroom 706", type: "CLASSROOM" },
    { id: "7", code: "RB-707", roomNumber: "707", name: "EEN Classroom 707", type: "CLASSROOM" },
    { id: "8", code: "RB-708", roomNumber: "708", name: "CSE Classroom 708", type: "CLASSROOM" },
    { id: "9", code: "RB-601", roomNumber: "601", name: "MEN Classroom 601", type: "CLASSROOM" },
    { id: "10", code: "RB-602", roomNumber: "602", name: "MEN Lab 602", type: "LAB" },
    { id: "11", code: "RB-603", roomNumber: "603", name: "CEN Classroom 603", type: "CLASSROOM" },
    { id: "12", code: "RB-604", roomNumber: "604", name: "CEN Classroom 604", type: "CLASSROOM" },
    { id: "13", code: "RB-606", roomNumber: "606", name: "CSE Lab 606", type: "LAB", block: "RIGHT" },
    { id: "14", code: "RB-608", roomNumber: "608", name: "CSE Classroom 608", type: "CLASSROOM", block: "RIGHT" },
    { id: "15", code: "LB-506", roomNumber: "506", name: "CSE Lab 506", type: "LAB", block: "LEFT" },
    { id: "16", code: "LB-507", roomNumber: "507", name: "CSE Lab 507", type: "LAB", block: "LEFT" },
    { id: "17", code: "CB-708", roomNumber: "708", name: "CSE Lab 708", type: "LAB", block: "CENTRAL" },
    { id: "18", code: "CB-608", roomNumber: "608", name: "CSE Lab 608", type: "LAB", block: "CENTRAL" },
    { id: "19", code: "CB-606", roomNumber: "606", name: "CSE Lab 606", type: "LAB", block: "CENTRAL" },
    { id: "20", code: "CB-506", roomNumber: "506", name: "CSE Lab 506", type: "LAB", block: "CENTRAL" },
    { id: "21", code: "CB-507", roomNumber: "507", name: "CSE Lab 507", type: "LAB", block: "CENTRAL" },
  ];

  const fixtureBuffer = readFileSync(join(process.cwd(), "CSE_Routine_Jul-Dec_2026.xlsx"));
  const parsed = parseTimetableWorkbook(fixtureBuffer);

  const summary = resolveTimetableEntries(parsed.entries, {
    resources: allResources,
    faculty: [
      { id: "f1", name: "Dr. Saiyed Umer", shortCode: "SU" },
      { id: "f2", name: "Dr. Moumita Chatterjee", shortCode: "MC" },
    ],
    subjects: [
      { id: "s1", code: "MCAPGPC01", name: "Advanced Java Programming" },
      { id: "s2", code: "CSEUGPC02", name: "Data Structures" },
    ],
    programs: [
      { id: "p1", code: "MCA", name: "MCA" },
      { id: "p2", code: "BCA", name: "BCA" },
      { id: "p3", code: "BTECH", name: "B.Tech" },
    ],
    teachersMap: parsed.teachers,
  });

  console.log(`  Total entries: ${summary.totalEntries}`);
  console.log(`  Resolved entries: ${summary.resolvedCount}`);
  console.log(`  Unresolved resource entries: ${summary.unresolvedResourceCount}`);
  console.log(`  No-resource entries (external/off-grid): ${summary.noResourceCount}`);
  console.log(`  Internal conflicts: ${summary.internalConflictCount}`);

  assert(summary.resolvedCount > 180, `Expected > 180 resolved entries, got ${summary.resolvedCount}`);
  assert(summary.unresolvedResourceCount === 0, `Expected 0 unresolved rooms with full room list, got ${summary.unresolvedResourceCount}`);
  assert(summary.noResourceCount > 0, `Expected no-resource entries (external dept), got ${summary.noResourceCount}`);
  passed++;

  console.log(`\n🎉 ALL ${passed} RESOLVER TESTS PASSED SUCCESSFULLY!`);
}

runTests();
