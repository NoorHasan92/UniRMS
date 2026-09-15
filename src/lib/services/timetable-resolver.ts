import { DayOfWeek } from "@prisma/client";
import { ParsedTimetableEntry } from "./timetable-parser";

export interface ResolvableResource {
  id: string;
  code: string;
  roomNumber: string;
  name: string;
  type: string;
  departmentId?: string | null;
}

export interface ResolvableFaculty {
  id: string;
  name: string;
  shortCode?: string | null;
  departmentId?: string | null;
}

export interface ResolvableSubject {
  id: string;
  code: string;
  name: string;
  departmentId?: string | null;
}

export interface ResolvableProgram {
  id: string;
  code: string;
  name: string;
  departmentId?: string | null;
}

export interface ExistingScheduleSlot {
  id: string;
  resourceId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  timetableId?: string | null;
  subjectCode?: string | null;
  semesterLabel?: string | null;
}

export interface ResolvedTimetableEntry {
  entry: ParsedTimetableEntry;
  resourceId?: string;
  resourceCode?: string;
  resourceName?: string;
  facultyId?: string;
  facultyName?: string;
  subjectId?: string;
  subjectName?: string;
  programId?: string;
  programCode?: string;
  year?: number;
  section?: string;
  status: "RESOLVED" | "UNRESOLVED_RESOURCE" | "NO_RESOURCE";
  message?: string;
}

export interface TimetableConflict {
  type: "INTERNAL_OVERLAP" | "EXISTING_SCHEDULE_CONFLICT";
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  resourceCode: string;
  resourceName?: string;
  entry1: {
    semesterLabel: string;
    subjectCode: string;
    sourceRow: number;
    sourceCol: number;
    time: string;
  };
  entry2: {
    semesterLabel: string;
    subjectCode: string;
    sourceRow: number;
    sourceCol: number;
    time: string;
    existingScheduleId?: string;
  };
  message: string;
}

export interface TimetableResolutionSummary {
  totalEntries: number;
  resolvedCount: number;
  unresolvedResourceCount: number;
  noResourceCount: number;
  internalConflictCount: number;
  existingConflictCount: number;
  uniqueRoomsFound: string[];
  unresolvedRooms: string[];
  resolvedEntries: ResolvedTimetableEntry[];
  unresolvedEntries: ResolvedTimetableEntry[];
  noResourceEntries: ResolvedTimetableEntry[];
  conflicts: TimetableConflict[];
}

/**
 * Normalizes a raw room string for deterministic lookup.
 * e.g. "RB-705" -> "RB705", "rb 705" -> "RB705", "Lab -606" -> "606", "608" -> "608"
 */
export function normalizeRoomCode(code: string): string {
  if (!code) return "";
  let clean = code.trim().toUpperCase().replace(/[-\s.]/g, "");
  if (clean.startsWith("LAB") && clean.length > 3) {
    clean = clean.substring(3);
  }
  return clean;
}

/**
 * Matches a normalized room code to a database Resource record.
 */
export function matchResource(
  rawRoomCode: string,
  resources: ResolvableResource[]
): ResolvableResource | null {
  if (!rawRoomCode) return null;
  const norm = normalizeRoomCode(rawRoomCode);
  if (!norm) return null;

  // 1. Direct code match (e.g. "RB705" matches resource "RB-705")
  for (const r of resources) {
    const rNorm = normalizeRoomCode(r.code);
    if (rNorm === norm) return r;
  }

  // 2. Room number match (e.g. "608" matches roomNumber "608")
  for (const r of resources) {
    const rNum = normalizeRoomCode(r.roomNumber);
    if (rNum === norm) return r;
  }

  // 3. Block prefix stripped match:
  // If norm has block prefix ("RB608"), check if r.roomNumber is "608"
  const strippedNorm = norm.replace(/^(RB|LB)/i, "");
  if (strippedNorm && strippedNorm !== norm) {
    for (const r of resources) {
      if (normalizeRoomCode(r.roomNumber) === strippedNorm) return r;
    }
  }

  // If norm doesn't have block prefix ("608"), check if r.code ends with norm
  for (const r of resources) {
    const rNorm = normalizeRoomCode(r.code);
    if (rNorm.endsWith(norm)) return r;
  }

  return null;
}

/**
 * Parses academic semester string to extract year, section, and program hint.
 * e.g. "1st MCA" -> year 1, program "MCA"
 * e.g. "7th CSE" -> year 4, program "BTECH"
 * e.g. "1st CSE (SecB)" -> year 1, section "B", program "BTECH"
 */
export function parseSemesterLabel(label: string): {
  year?: number;
  section?: string;
  programCode?: string;
} {
  if (!label) return {};
  const s = label.trim();

  let year: number | undefined = undefined;
  let section: string | undefined = undefined;
  let programCode: string | undefined = undefined;

  // Extract explicit section e.g. "SecB", "Sec B", "Section B", "Sec-A"
  const secMatch = s.match(/(?:sec(?:tion)?\s*[-]?\s*)([A-D])/i);
  if (secMatch) {
    section = secMatch[1].toUpperCase();
  }

  // Extract semester number and convert to year
  const semMatch = s.match(/^(\d)(?:st|nd|rd|th)?/i);
  if (semMatch) {
    const semNum = parseInt(semMatch[1], 10);
    year = Math.ceil(semNum / 2);
  }

  // Extract program code hint
  if (/mca/i.test(s)) programCode = "MCA";
  else if (/bca/i.test(s)) programCode = "BCA";
  else if (/m\.?tech/i.test(s)) programCode = "MTECH";
  else if (/cse|ece|een|men|cen|b\.?tech/i.test(s)) programCode = "BTECH";
  else if (/mba/i.test(s)) programCode = "MBA";
  else if (/bba/i.test(s)) programCode = "BBA";
  else if (/bcom/i.test(s)) programCode = "BCOM";
  else if (/phd/i.test(s)) programCode = "PHD";

  return { year, section, programCode };
}

/**
 * Checks if two time intervals [s1, e1) and [s2, e2) overlap.
 * Format expected: "HH:mm".
 */
export function doTimesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

/**
 * Resolves a list of parsed timetable entries against database entities:
 * Resources, Faculty, Subjects, Programs.
 * Detects internal overlaps and clashes against existing active schedules.
 */
export function resolveTimetableEntries(
  entries: ParsedTimetableEntry[],
  context: {
    resources: ResolvableResource[];
    faculty: ResolvableFaculty[];
    subjects: ResolvableSubject[];
    programs: ResolvableProgram[];
    existingSchedules?: ExistingScheduleSlot[];
    teachersMap?: Map<string, string>; // From Teachers sheet
    currentTimetableId?: string; // To ignore own existing slots if re-importing
  }
): TimetableResolutionSummary {
  const { resources, faculty, subjects, programs, existingSchedules = [], teachersMap, currentTimetableId } = context;

  // Build lookup maps
  const facByCode = new Map<string, ResolvableFaculty>();
  const facByName = new Map<string, ResolvableFaculty>();
  for (const f of faculty) {
    if (f.shortCode) facByCode.set(f.shortCode.toUpperCase(), f);
    facByName.set(f.name.toLowerCase().trim(), f);
  }

  const subByCode = new Map<string, ResolvableSubject>();
  for (const s of subjects) {
    subByCode.set(s.code.toUpperCase().trim(), s);
  }

  const progByCode = new Map<string, ResolvableProgram>();
  for (const p of programs) {
    progByCode.set(p.code.toUpperCase().trim(), p);
  }

  const resolvedEntries: ResolvedTimetableEntry[] = [];
  const unresolvedEntries: ResolvedTimetableEntry[] = [];
  const noResourceEntries: ResolvedTimetableEntry[] = [];
  const uniqueRoomsSet = new Set<string>();
  const unresolvedRoomsSet = new Set<string>();

  for (const entry of entries) {
    const rawRoom = entry.roomCode;
    if (rawRoom) uniqueRoomsSet.add(rawRoom);

    // If entry has no room specified (e.g. external department row)
    if (!rawRoom) {
      noResourceEntries.push({
        entry,
        status: "NO_RESOURCE",
        message: "No classroom or laboratory specified for this row (informational).",
      });
      continue;
    }

    // Match resource
    const matchedResource = matchResource(rawRoom, resources);
    if (!matchedResource) {
      unresolvedRoomsSet.add(rawRoom);
      unresolvedEntries.push({
        entry,
        status: "UNRESOLVED_RESOURCE",
        message: `Resource code "${rawRoom}" does not match any registered room in UniRMS.`,
      });
      continue;
    }

    // Resolve Semester / Program / Year
    const semInfo = parseSemesterLabel(entry.semesterLabel);
    let matchedProgram: ResolvableProgram | undefined = undefined;
    if (semInfo.programCode && progByCode.has(semInfo.programCode)) {
      matchedProgram = progByCode.get(semInfo.programCode);
    }

    // Resolve Faculty (optional)
    let matchedFaculty: ResolvableFaculty | undefined = undefined;
    for (const fCode of entry.facultyCodes) {
      const codeUpper = fCode.toUpperCase();
      if (facByCode.has(codeUpper)) {
        matchedFaculty = facByCode.get(codeUpper);
        break;
      }
      // Check via Teachers sheet mapping
      if (teachersMap && teachersMap.has(codeUpper)) {
        const teacherName = teachersMap.get(codeUpper)?.toLowerCase().trim();
        if (teacherName && facByName.has(teacherName)) {
          matchedFaculty = facByName.get(teacherName);
          break;
        }
      }
    }

    // Resolve Subject (optional)
    let matchedSubject: ResolvableSubject | undefined = undefined;
    const subCodeUpper = entry.subjectCode.toUpperCase().trim();
    if (subByCode.has(subCodeUpper)) {
      matchedSubject = subByCode.get(subCodeUpper);
    }

    resolvedEntries.push({
      entry,
      resourceId: matchedResource.id,
      resourceCode: matchedResource.code,
      resourceName: matchedResource.name,
      facultyId: matchedFaculty?.id,
      facultyName: matchedFaculty?.name,
      subjectId: matchedSubject?.id,
      subjectName: matchedSubject?.name || entry.subjectName,
      programId: matchedProgram?.id,
      programCode: matchedProgram?.code,
      year: semInfo.year,
      section: semInfo.section,
      status: "RESOLVED",
    });
  }

  // Conflict Detection:
  const conflicts: TimetableConflict[] = [];

  // 1. Internal overlaps (two classes scheduled in same room at overlapping times)
  for (let i = 0; i < resolvedEntries.length; i++) {
    const e1 = resolvedEntries[i];
    for (let j = i + 1; j < resolvedEntries.length; j++) {
      const e2 = resolvedEntries[j];
      if (
        e1.resourceId === e2.resourceId &&
        e1.entry.dayOfWeek === e2.entry.dayOfWeek &&
        doTimesOverlap(e1.entry.startTime, e1.entry.endTime, e2.entry.startTime, e2.entry.endTime)
      ) {
        conflicts.push({
          type: "INTERNAL_OVERLAP",
          dayOfWeek: e1.entry.dayOfWeek,
          startTime: e1.entry.startTime > e2.entry.startTime ? e1.entry.startTime : e2.entry.startTime,
          endTime: e1.entry.endTime < e2.entry.endTime ? e1.entry.endTime : e2.entry.endTime,
          resourceCode: e1.resourceCode || e1.entry.roomCode,
          resourceName: e1.resourceName,
          entry1: {
            semesterLabel: e1.entry.semesterLabel,
            subjectCode: e1.entry.subjectCode,
            sourceRow: e1.entry.sourceRow,
            sourceCol: e1.entry.sourceStartCol,
            time: `${e1.entry.startTime} - ${e1.entry.endTime}`,
          },
          entry2: {
            semesterLabel: e2.entry.semesterLabel,
            subjectCode: e2.entry.subjectCode,
            sourceRow: e2.entry.sourceRow,
            sourceCol: e2.entry.sourceStartCol,
            time: `${e2.entry.startTime} - ${e2.entry.endTime}`,
          },
          message: `Internal overlap in ${e1.resourceCode} on ${e1.entry.dayOfWeek}: "${e1.entry.subjectCode}" (${e1.entry.startTime}-${e1.entry.endTime}) conflicts with "${e2.entry.subjectCode}" (${e2.entry.startTime}-${e2.entry.endTime}).`,
        });
      }
    }
  }

  // 2. Existing active schedule conflicts
  for (const resolved of resolvedEntries) {
    if (!resolved.resourceId) continue;
    for (const ex of existingSchedules) {
      // Ignore existing schedules belonging to this same timetable if updating
      if (currentTimetableId && ex.timetableId === currentTimetableId) continue;

      if (
        ex.resourceId === resolved.resourceId &&
        ex.dayOfWeek === resolved.entry.dayOfWeek &&
        doTimesOverlap(resolved.entry.startTime, resolved.entry.endTime, ex.startTime, ex.endTime)
      ) {
        conflicts.push({
          type: "EXISTING_SCHEDULE_CONFLICT",
          dayOfWeek: resolved.entry.dayOfWeek,
          startTime: resolved.entry.startTime > ex.startTime ? resolved.entry.startTime : ex.startTime,
          endTime: resolved.entry.endTime < ex.endTime ? resolved.entry.endTime : ex.endTime,
          resourceCode: resolved.resourceCode || resolved.entry.roomCode,
          resourceName: resolved.resourceName,
          entry1: {
            semesterLabel: resolved.entry.semesterLabel,
            subjectCode: resolved.entry.subjectCode,
            sourceRow: resolved.entry.sourceRow,
            sourceCol: resolved.entry.sourceStartCol,
            time: `${resolved.entry.startTime} - ${resolved.entry.endTime}`,
          },
          entry2: {
            semesterLabel: ex.semesterLabel || "Active Timetable Schedule",
            subjectCode: ex.subjectCode || "Existing Class",
            sourceRow: 0,
            sourceCol: 0,
            time: `${ex.startTime} - ${ex.endTime}`,
            existingScheduleId: ex.id,
          },
          message: `Clash with existing active schedule in ${resolved.resourceCode} on ${resolved.entry.dayOfWeek}: "${resolved.entry.subjectCode}" (${resolved.entry.startTime}-${resolved.entry.endTime}) clashes with "${ex.subjectCode || "Class"}" (${ex.startTime}-${ex.endTime}).`,
        });
      }
    }
  }

  const internalConflictCount = conflicts.filter((c) => c.type === "INTERNAL_OVERLAP").length;
  const existingConflictCount = conflicts.filter((c) => c.type === "EXISTING_SCHEDULE_CONFLICT").length;

  return {
    totalEntries: entries.length,
    resolvedCount: resolvedEntries.length,
    unresolvedResourceCount: unresolvedEntries.length,
    noResourceCount: noResourceEntries.length,
    internalConflictCount,
    existingConflictCount,
    uniqueRoomsFound: Array.from(uniqueRoomsSet),
    unresolvedRooms: Array.from(unresolvedRoomsSet),
    resolvedEntries,
    unresolvedEntries,
    noResourceEntries,
    conflicts,
  };
}
