import { readFileSync } from "fs";
import { join } from "path";
import {
  parseTimeSlotHeader,
  matchDayOfWeek,
  parseCellContent,
  computeEntryTime,
  parseTimetableWorkbook,
  type TimeSlot,
} from "../timetable-parser";
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
  console.log("🧪 Running timetable parser test suite...\n");
  let passed = 0;

  // ----------------------------------------------------
  // Test 1: parseTimeSlotHeader
  // ----------------------------------------------------
  console.log("▶ Testing parseTimeSlotHeader...");

  const t1 = parseTimeSlotHeader("10.00 - 11.00");
  assertEqual(t1?.startTime, "10:00", "10.00 start");
  assertEqual(t1?.endTime, "11:00", "11.00 end");
  passed++;

  const t2 = parseTimeSlotHeader("12.00 - 01.00");
  assertEqual(t2?.startTime, "12:00", "12.00 start");
  assertEqual(t2?.endTime, "13:00", "01.00 converted to 13:00");
  passed++;

  const t3 = parseTimeSlotHeader("1.40 - 2.40");
  assertEqual(t3?.startTime, "13:40", "1.40 converted to 13:40");
  assertEqual(t3?.endTime, "14:40", "2.40 converted to 14:40");
  passed++;

  const t4 = parseTimeSlotHeader("4.40 - 5.40");
  assertEqual(t4?.startTime, "16:40", "4.40 converted to 16:40");
  assertEqual(t4?.endTime, "17:40", "5.40 converted to 17:40");
  passed++;

  const t5 = parseTimeSlotHeader("12.30 - 2.00");
  assertEqual(t5?.startTime, "12:30", "12.30 start");
  assertEqual(t5?.endTime, "14:00", "2.00 converted to 14:00");
  passed++;

  const t6 = parseTimeSlotHeader("BREAK");
  assertEqual(t6, null, "BREAK returns null");
  passed++;

  const t7 = parseTimeSlotHeader("X");
  assertEqual(t7, null, "X returns null");
  passed++;

  const t8 = parseTimeSlotHeader("Room No");
  assertEqual(t8, null, "Room No returns null");
  passed++;

  // ----------------------------------------------------
  // Test 2: matchDayOfWeek
  // ----------------------------------------------------
  console.log("▶ Testing matchDayOfWeek...");

  assertEqual(matchDayOfWeek("Mon"), DayOfWeek.MONDAY, "Mon -> MONDAY");
  assertEqual(matchDayOfWeek("Monday"), DayOfWeek.MONDAY, "Monday -> MONDAY");
  assertEqual(matchDayOfWeek("Tue"), DayOfWeek.TUESDAY, "Tue -> TUESDAY");
  assertEqual(matchDayOfWeek("Wednesday"), DayOfWeek.WEDNESDAY, "Wednesday -> WEDNESDAY");
  assertEqual(matchDayOfWeek("Thu"), DayOfWeek.THURSDAY, "Thu -> THURSDAY");
  assertEqual(matchDayOfWeek("Fri"), DayOfWeek.FRIDAY, "Fri -> FRIDAY");
  assertEqual(matchDayOfWeek("Saturday"), DayOfWeek.SATURDAY, "Saturday -> SATURDAY");
  assertEqual(matchDayOfWeek("Routine for CSE - Monday to Thursday"), null, "Routine title is not a day");
  passed++;

  // ----------------------------------------------------
  // Test 3: parseCellContent
  // ----------------------------------------------------
  console.log("▶ Testing parseCellContent...");

  const c1 = parseCellContent("MCAPGPC01/SU");
  assertEqual(c1.isClass, true, "MCAPGPC01/SU is class");
  assertEqual(c1.subjectCode, "MCAPGPC01", "MCAPGPC01 subject");
  assert(c1.facultyCodes.includes("SU"), "faculty includes SU");
  assertEqual(c1.classType, "LECTURE", "lecture type");
  assertEqual(c1.altRoom, undefined, "no alt room");
  passed++;

  const c2 = parseCellContent("CSAUGPC06(LAB)/GSH(608)");
  assertEqual(c2.isClass, true, "lab cell is class");
  assertEqual(c2.classType, "LAB", "lab type");
  assertEqual(c2.subjectCode, "CSAUGPC06", "clean subject code");
  assert(c2.facultyCodes.includes("GSH"), "faculty includes GSH");
  assertEqual(c2.altRoom, "608", "altRoom is 608");
  passed++;

  const c3 = parseCellContent("Remedial Class");
  assertEqual(c3.isClass, true, "remedial is class");
  assertEqual(c3.classType, "REMEDIAL", "remedial type");
  assertEqual(c3.subjectCode, "REMEDIAL", "subject code REMEDIAL");
  passed++;

  const c4 = parseCellContent("Tutorial Class");
  assertEqual(c4.isClass, true, "tutorial is class");
  assertEqual(c4.classType, "TUTORIAL", "tutorial type");
  passed++;

  const c5 = parseCellContent("CSAUGPC04/ZR (Lab -606)");
  assertEqual(c5.classType, "LAB", "lab type from Lab -606");
  assertEqual(c5.altRoom, "606", "altRoom is 606");
  passed++;

  const c6 = parseCellContent("MCAPGPR01 (Minor Project)");
  assertEqual(c6.classType, "PROJECT", "project class type");
  assertEqual(c6.subjectCode, "MCAPGPR01", "subject code MCAPGPR01");
  assertEqual(c6.subjectName, "Minor Project", "subject name Minor Project");
  passed++;

  const c7 = parseCellContent("BREAK");
  assertEqual(c7.isClass, false, "BREAK is not class");
  passed++;

  // ----------------------------------------------------
  // Test 4: computeEntryTime
  // ----------------------------------------------------
  console.log("▶ Testing computeEntryTime...");

  const timeMap = new Map<number, TimeSlot>([
    [3, { startTime: "10:00", endTime: "11:00", rawHeader: "10.00-11.00" }],
    [4, { startTime: "11:00", endTime: "12:00", rawHeader: "11.00-12.00" }],
    [5, { startTime: "12:00", endTime: "13:00", rawHeader: "12.00-01.00" }],
  ]);

  const singleCol = computeEntryTime(3, 3, timeMap);
  assertEqual(singleCol?.startTime, "10:00", "single col start");
  assertEqual(singleCol?.endTime, "11:00", "single col end");
  passed++;

  const mergedCols = computeEntryTime(3, 5, timeMap);
  assertEqual(mergedCols?.startTime, "10:00", "merged span start");
  assertEqual(mergedCols?.endTime, "13:00", "merged span end");
  passed++;

  // ----------------------------------------------------
  // Test 5: Full Workbook parsing with regression fixture
  // ----------------------------------------------------
  console.log("▶ Testing parseTimetableWorkbook on CSE_Routine_Jul-Dec_2026.xlsx...");

  const fixturePath = join(process.cwd(), "CSE_Routine_Jul-Dec_2026.xlsx");
  const fileBuffer = readFileSync(fixturePath);
  const result = parseTimetableWorkbook(fileBuffer);

  assert(result.sheetsParsed.includes("Monday-Thursday"), "Parsed Monday-Thursday sheet");
  assert(result.sheetsParsed.includes("Friday"), "Parsed Friday sheet");
  assert(result.sheetsParsed.includes("Teachers"), "Parsed Teachers sheet");
  passed++;

  console.log(`  Sheets parsed: ${result.sheetsParsed.join(", ")}`);
  console.log(`  Total teachers mapped: ${result.teachers.size}`);
  console.log(`  Total entries parsed: ${result.entries.length}`);
  console.log(`  Warnings count: ${result.warnings.length}`);
  console.log(`  Errors count: ${result.errors.length}`);

  assertEqual(result.errors.length, 0, "Zero fatal parse errors");
  assert(result.teachers.size >= 25, `Expected >= 25 teachers, got ${result.teachers.size}`);
  assertEqual(result.teachers.get("SU"), "Dr. Saiyed Umer", "SU maps to Dr. Saiyed Umer");
  assertEqual(result.teachers.get("MC"), "Dr. Moumita Chatterjee", "MC maps to Dr. Moumita Chatterjee");
  assertEqual(result.teachers.get("AD"), "Prof. Abhishek Das", "AD maps to Prof. Abhishek Das");
  passed++;

  assert(result.entries.length >= 200, `Expected >= 200 entries, got ${result.entries.length}`);
  passed++;

  // Verify multi-hour lab merges exist
  const multiHourLabs = result.entries.filter(
    (e) => e.sourceEndCol > e.sourceStartCol && e.classType === "LAB"
  );
  console.log(`  Multi-hour lab merged entries found: ${multiHourLabs.length}`);
  assert(multiHourLabs.length > 0, "Found multi-hour lab merges");
  passed++;

  // Verify alt rooms exist
  const altRoomEntries = result.entries.filter((e) => e.altRoomCode);
  console.log(`  Entries with alt room overrides: ${altRoomEntries.length}`);
  assert(altRoomEntries.length > 0, "Found entries with alt room overrides");
  passed++;

  console.log(`\n🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
}

runTests();
