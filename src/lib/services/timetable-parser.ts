import * as XLSX from "xlsx";
import { DayOfWeek } from "@prisma/client";

export interface TimeSlot {
  startTime: string; // "HH:mm" 24h
  endTime: string;   // "HH:mm" 24h
  rawHeader: string;
}

export interface DaySection {
  dayOfWeek: DayOfWeek;
  startRow: number;
  endRow: number;
  label: string;
}

export interface ParsedCellContent {
  rawText: string;
  isClass: boolean; // false for BREAK, empty, non-academic
  classType: "LECTURE" | "LAB" | "TUTORIAL" | "REMEDIAL" | "PROJECT" | "OTHER";
  subjectCode: string;
  subjectName?: string;
  facultyCodes: string[];
  altRoom?: string; // Room override specified in cell e.g. "(708)", "(606)", "(506)"
  notes?: string;
}

export interface ParsedTimetableEntry {
  sheetName: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  semesterLabel: string;
  roomCode: string; // Effective room code (altRoom if present, otherwise row base room)
  baseRoomCode: string; // Col C raw room
  altRoomCode?: string; // Alt room from cell if any
  subjectCode: string;
  subjectName?: string;
  facultyCodes: string[];
  classType: string;
  rawContent: string;
  sourceRow: number;
  sourceStartCol: number;
  sourceEndCol: number;
}

export interface TimetableParseWarning {
  sheetName: string;
  row?: number;
  col?: number;
  message: string;
  severity: "INFO" | "WARNING";
}

export interface TimetableParseError {
  sheetName: string;
  row?: number;
  col?: number;
  message: string;
}

export interface ParsedTimetableResult {
  entries: ParsedTimetableEntry[];
  teachers: Map<string, string>; // Faculty code -> teacher full name
  sheetsParsed: string[];
  metadata: {
    totalEntriesParsed: number;
    sheetStats: Record<string, { entriesCount: number; daySections: string[] }>;
  };
  warnings: TimetableParseWarning[];
  errors: TimetableParseError[];
}

/**
 * Parses a column header string into a 24-hour startTime and endTime.
 * Handles period-separated ("10.00 - 11.00"), colon-separated ("10:00 - 11:00"),
 * and 12-hour afternoon inferences (e.g. "1.40 - 2.40" -> 13:40 - 14:40).
 */
export function parseTimeSlotHeader(text: string): TimeSlot | null {
  if (!text) return null;
  const raw = String(text).trim().replace(/[–—]/g, "-");

  // Skip explicit break / non-time headers
  if (/^(BREAK|RECESS|LUNCH|PRAYER|X|DAYS?|SEMESTER|ROOM.*|TIME.*)$/i.test(raw)) {
    return null;
  }

  // Match e.g. "10.00 - 11.00", "12.30 - 2.00", "1.40-2.40", "10:00 to 11:00"
  const match = raw.match(/^(\d{1,2})[.:](\d{2})\s*(?:am|pm)?\s*(?:-|to)\s*(\d{1,2})[.:](\d{2})\s*(?:am|pm)?$/i);
  if (!match) return null;

  let sh = parseInt(match[1], 10);
  const sm = parseInt(match[2], 10);
  let eh = parseInt(match[3], 10);
  const em = parseInt(match[4], 10);

  // University class hours convention:
  // 1 through 7 are afternoon hours (13:00 to 19:00).
  // 8 through 12 are morning/noon hours (08:00 to 12:00).
  if (sh >= 1 && sh <= 7) sh += 12;
  if (eh >= 1 && eh <= 7) eh += 12;
  else if (eh < sh && eh < 12) eh += 12;

  const startTime = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
  const endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

  return { startTime, endTime, rawHeader: raw };
}

/**
 * Matches a day string to a Prisma DayOfWeek enum.
 */
export function matchDayOfWeek(str: string): DayOfWeek | null {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (/^mon(?:day)?$/.test(s)) return DayOfWeek.MONDAY;
  if (/^tue(?:s|sday)?$/.test(s)) return DayOfWeek.TUESDAY;
  if (/^wed(?:nesday)?$/.test(s)) return DayOfWeek.WEDNESDAY;
  if (/^thu(?:r|rs|rsday)?$/.test(s)) return DayOfWeek.THURSDAY;
  if (/^fri(?:day)?$/.test(s)) return DayOfWeek.FRIDAY;
  if (/^sat(?:urday)?$/.test(s)) return DayOfWeek.SATURDAY;
  return null;
}

/**
 * Detects which row contains time slot headers by scanning rows 0 to 4.
 * Returns the row index that has at least 2 valid time slot headers, or -1 if none found.
 */
export function detectHeaderRowIndex(ws: XLSX.WorkSheet, maxScanRows = 5): number {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const limit = Math.min(range.e.r, maxScanRows);

  for (let r = range.s.r; r <= limit; r++) {
    let validSlots = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        if (parseTimeSlotHeader(String(cell.v))) {
          validSlots++;
        }
      }
    }
    if (validSlots >= 2) {
      return r;
    }
  }
  return -1;
}

/**
 * Scans a header row and returns a map of columnIndex -> TimeSlot for all valid time columns.
 */
export function detectTimeColumns(ws: XLSX.WorkSheet, headerRowIndex: number): Map<number, TimeSlot> {
  const timeCols = new Map<number, TimeSlot>();
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
    if (cell && cell.v) {
      const slot = parseTimeSlotHeader(String(cell.v));
      if (slot) {
        timeCols.set(c, slot);
      }
    }
  }

  return timeCols;
}

/**
 * Detects Day sections within a timetable worksheet using merged cells on column A
 * or row scans/sheet names.
 */
export function detectDaySections(
  ws: XLSX.WorkSheet,
  range: XLSX.Range,
  merges: XLSX.Range[],
  sheetName: string,
  headerRowIndex: number
): DaySection[] {
  const daySections: DaySection[] = [];

  // Strategy 1: Merges on Column A (col 0)
  const colAMerges = merges.filter((m) => m.s.c === 0 && m.s.r > headerRowIndex);
  for (const m of colAMerges) {
    const cell = ws[XLSX.utils.encode_cell(m.s)];
    if (cell && cell.v) {
      const day = matchDayOfWeek(String(cell.v));
      if (day) {
        daySections.push({
          dayOfWeek: day,
          startRow: m.s.r,
          endRow: m.e.r,
          label: String(cell.v).trim(),
        });
      }
    }
  }

  if (daySections.length > 0) {
    // Sort by starting row
    return daySections.sort((a, b) => a.startRow - b.startRow);
  }

  // Strategy 2: If sheetName itself represents a day (e.g. "Friday")
  const sheetDay = matchDayOfWeek(sheetName);
  if (sheetDay && range.e.r > headerRowIndex) {
    return [
      {
        dayOfWeek: sheetDay,
        startRow: headerRowIndex + 1,
        endRow: range.e.r,
        label: sheetName,
      },
    ];
  }

  // Strategy 3: Scan column A row-by-row
  let currentDay: DayOfWeek | null = null;
  let currentStart = -1;
  let currentLabel = "";

  for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    const val = cell ? String(cell.v).trim() : "";
    const matched = matchDayOfWeek(val);

    if (matched && matched !== currentDay) {
      if (currentDay !== null && currentStart !== -1) {
        daySections.push({
          dayOfWeek: currentDay,
          startRow: currentStart,
          endRow: r - 1,
          label: currentLabel,
        });
      }
      currentDay = matched;
      currentStart = r;
      currentLabel = val;
    }
  }

  if (currentDay !== null && currentStart !== -1) {
    daySections.push({
      dayOfWeek: currentDay,
      startRow: currentStart,
      endRow: range.e.r,
      label: currentLabel,
    });
  }

  return daySections;
}

/**
 * Classifies a worksheet as 'TIMETABLE', 'TEACHERS', or 'UNKNOWN'.
 */
export function classifySheet(ws: XLSX.WorkSheet, sheetName: string): "TIMETABLE" | "TEACHERS" | "UNKNOWN" {
  const name = sheetName.toLowerCase();
  if (name.includes("teacher") || name.includes("faculty")) {
    return "TEACHERS";
  }

  const headerRow = detectHeaderRowIndex(ws);
  if (headerRow !== -1) {
    return "TIMETABLE";
  }

  // Check if first 3 rows contain "Teacher" or "Faculty" headers
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = range.s.r; r <= Math.min(range.e.r, 3); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 3); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v && /teacher|faculty/i.test(String(cell.v))) {
        return "TEACHERS";
      }
    }
  }

  return "UNKNOWN";
}

/**
 * Parses the teachers/faculty mapping sheet into a Map<shortCode, fullName>.
 */
export function parseTeachersSheet(ws: XLSX.WorkSheet): Map<string, string> {
  const teachers = new Map<string, string>();
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // Find column headers for Code and Teacher Name
  let codeCol = 0;
  let nameCol = 1;
  let startRow = range.s.r;

  for (let r = range.s.r; r <= Math.min(range.e.r, 5); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 5); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        const val = String(cell.v).trim().toLowerCase();
        if (val === "code" || val === "short code" || val === "faculty code") {
          codeCol = c;
          startRow = r + 1;
        } else if (val === "teacher" || val === "teacher name" || val === "faculty name") {
          nameCol = c;
          startRow = r + 1;
        }
      }
    }
  }

  for (let r = startRow; r <= range.e.r; r++) {
    const codeCell = ws[XLSX.utils.encode_cell({ r, c: codeCol })];
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: nameCol })];
    if (codeCell && codeCell.v && nameCell && nameCell.v) {
      const code = String(codeCell.v).trim();
      const name = String(nameCell.v).trim();
      if (code && name && code.toLowerCase() !== "code" && name.toLowerCase() !== "teacher") {
        teachers.set(code, name);
      }
    }
  }

  return teachers;
}

/**
 * Parses a single timetable cell's text into structured academic metadata:
 * subjectCode, facultyCodes, classType, and altRoom.
 */
export function parseCellContent(rawInput: string): ParsedCellContent {
  let text = String(rawInput).trim();
  if (!text || /^(BREAK|RECESS|LUNCH|PRAYER|X|-)$/i.test(text)) {
    return {
      rawText: text,
      isClass: false,
      classType: "OTHER",
      subjectCode: "",
      facultyCodes: [],
    };
  }

  let classType: "LECTURE" | "LAB" | "TUTORIAL" | "REMEDIAL" | "PROJECT" | "OTHER" = "LECTURE";
  let altRoom: string | undefined = undefined;

  // 1. Extract alt room (e.g. "(608)", "(708)", "(Lab -606)", "(RB-708)", "(LB-501)", "(CB-708)")
  const roomMatch = text.match(/\((?:(?:Lab\s*[-–]?\s*)|(?:(RB|LB|CB)\s*[-–]?\s*))?([0-9]{3}[A-Z]?)\)/i);
  if (roomMatch) {
    const blockPrefix = roomMatch[1] ? `${roomMatch[1].toUpperCase()}-` : "";
    altRoom = (blockPrefix + roomMatch[2]).trim();
    classType = "LAB";
    text = text.replace(roomMatch[0], "").trim();
  }

  // 2. Detect LAB indicator
  if (/\(LAB\)/i.test(text)) {
    classType = "LAB";
    text = text.replace(/\(LAB\)/gi, "").trim();
  } else if (/\blab\b/i.test(text) && !/remedial|tutorial/i.test(text)) {
    classType = "LAB";
  }

  // 3. Remedial / Tutorial / Project
  if (/remedial/i.test(text)) {
    return {
      rawText: rawInput,
      isClass: true,
      classType: "REMEDIAL",
      subjectCode: "REMEDIAL",
      subjectName: "Remedial Class",
      facultyCodes: [],
      altRoom,
    };
  }

  if (/tutorial/i.test(text)) {
    return {
      rawText: rawInput,
      isClass: true,
      classType: "TUTORIAL",
      subjectCode: "TUTORIAL",
      subjectName: "Tutorial Class",
      facultyCodes: [],
      altRoom,
    };
  }

  if (/project|dissertation/i.test(text)) {
    classType = "PROJECT";
  }

  // 4. Parse Subject / Faculty components
  // Cells can have combinations: "SUBJ/FAC", "SUB1/FAC1, SUB2/FAC2", "SUBJ/FAC1+FAC2"
  const parts = text.split(/[,+]\s*/);
  const facultyCodes: string[] = [];
  let subjectCode = "";
  let subjectName = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (part.includes("/")) {
      const slashParts = part.split("/");
      const subj = slashParts[0].trim();
      const fac = slashParts.slice(1).join("/").trim();

      if (!subjectCode) subjectCode = subj;

      if (fac && fac.toUpperCase() !== "COMMON" && !fac.startsWith("(")) {
        fac.split(/[,/&+\s]+/).forEach((f) => {
          const cleanF = f.trim().replace(/[()]/g, "");
          if (cleanF && cleanF.length <= 6 && !facultyCodes.includes(cleanF)) {
            facultyCodes.push(cleanF);
          }
        });
      }
    } else {
      if (!subjectCode) subjectCode = part;
    }
  }

  // Check if subject has a parenthetical name e.g. "MCAPGPR01 (Minor Project)"
  const nameMatch = subjectCode.match(/^([A-Z0-9_-]+)\s*\((.+)\)$/i);
  if (nameMatch) {
    subjectCode = nameMatch[1].trim();
    subjectName = nameMatch[2].trim();
  }

  return {
    rawText: rawInput,
    isClass: true,
    classType,
    subjectCode: subjectCode || text,
    subjectName: subjectName || undefined,
    facultyCodes,
    altRoom,
  };
}

/**
 * Computes deterministic entry time from column span using time column mappings.
 */
export function computeEntryTime(
  startCol: number,
  endCol: number,
  timeCols: Map<number, TimeSlot>
): { startTime: string; endTime: string } | null {
  const startSlot = timeCols.get(startCol);
  if (!startSlot) return null;

  let endSlot = timeCols.get(endCol);
  if (!endSlot) {
    // If endCol lands on a BREAK or non-time column, find largest valid time col <= endCol
    for (let tc = endCol; tc >= startCol; tc--) {
      if (timeCols.has(tc)) {
        endSlot = timeCols.get(tc);
        break;
      }
    }
  }

  if (!endSlot) endSlot = startSlot;

  return {
    startTime: startSlot.startTime,
    endTime: endSlot.endTime,
  };
}

/**
 * Main workbook parser engine. Parses multi-sheet university timetable workbooks
 * using merge metadata and dynamic structural detection.
 */
export function parseTimetableWorkbook(buffer: ArrayBuffer | Buffer): ParsedTimetableResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const entries: ParsedTimetableEntry[] = [];
  const warnings: TimetableParseWarning[] = [];
  const errors: TimetableParseError[] = [];
  const sheetsParsed: string[] = [];
  const sheetStats: Record<string, { entriesCount: number; daySections: string[] }> = {};

  let teachers = new Map<string, string>();

  // Pass 1: Parse Teachers / Reference sheets first
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;

    const sheetType = classifySheet(ws, sheetName);
    if (sheetType === "TEACHERS") {
      const parsedTeachers = parseTeachersSheet(ws);
      teachers = new Map([...teachers, ...parsedTeachers]);
      sheetsParsed.push(sheetName);
    }
  }

  // Pass 2: Parse Timetable sheets
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;

    const sheetType = classifySheet(ws, sheetName);
    if (sheetType !== "TIMETABLE") continue;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const merges = ws["!merges"] || [];

    const headerRowIndex = detectHeaderRowIndex(ws);
    if (headerRowIndex === -1) {
      warnings.push({
        sheetName,
        message: `Could not detect time slot headers in sheet "${sheetName}". Skipped.`,
        severity: "WARNING",
      });
      continue;
    }

    const timeCols = detectTimeColumns(ws, headerRowIndex);
    if (timeCols.size === 0) {
      warnings.push({
        sheetName,
        message: `No valid time columns found in sheet "${sheetName}". Skipped.`,
        severity: "WARNING",
      });
      continue;
    }

    const daySections = detectDaySections(ws, range, merges, sheetName, headerRowIndex);
    if (daySections.length === 0) {
      errors.push({
        sheetName,
        message: `Could not detect day sections in sheet "${sheetName}".`,
      });
      continue;
    }

    // Build merge lookup structures:
    // nonOriginCells: set of 'r,c' strings that are spanned by a merge but not top-left
    // originSpans: map of top-left 'r,c' -> { endR, endC }
    const nonOriginCells = new Set<string>();
    const originSpans = new Map<string, { endR: number; endC: number }>();

    for (const m of merges) {
      originSpans.set(`${m.s.r},${m.s.c}`, { endR: m.e.r, endC: m.e.c });
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r !== m.s.r || c !== m.s.c) {
            nonOriginCells.add(`${r},${c}`);
          }
        }
      }
    }

    // Identify Semester Col and Room Col in headerRow
    let semesterCol = 1;
    let roomCol = 2;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
      if (cell && cell.v) {
        const val = String(cell.v).trim().toLowerCase();
        if (val.includes("semester") || val.includes("sem")) semesterCol = c;
        else if (val.includes("room")) roomCol = c;
      }
    }

    let sheetEntryCount = 0;
    const detectedDays: string[] = [];

    for (const sec of daySections) {
      detectedDays.push(sec.dayOfWeek);

      for (let r = sec.startRow; r <= sec.endRow; r++) {
        const semCell = ws[XLSX.utils.encode_cell({ r, c: semesterCol })];
        const roomCell = ws[XLSX.utils.encode_cell({ r, c: roomCol })];
        const semesterLabel = semCell ? String(semCell.v).trim() : "";
        const baseRoomCode = roomCell ? String(roomCell.v).trim() : "";

        // Iterate through all columns in the row
        for (let c = range.s.c; c <= range.e.c; c++) {
          // Skip header columns
          if (c === 0 || c === semesterCol || c === roomCol) continue;

          // If this cell is a covered non-origin of a merge, skip it
          if (nonOriginCells.has(`${r},${c}`)) continue;

          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell || cell.v === undefined || cell.v === null) continue;

          const rawText = String(cell.v).trim();
          if (!rawText) continue;

          const parsedCell = parseCellContent(rawText);
          if (!parsedCell.isClass) continue;

          // Determine column span from merge metadata
          const mergeInfo = originSpans.get(`${r},${c}`);
          const endCol = mergeInfo ? mergeInfo.endC : c;

          // Compute start & end time
          const time = computeEntryTime(c, endCol, timeCols);
          if (!time) {
            warnings.push({
              sheetName,
              row: r,
              col: c,
              message: `Could not determine time for cell at Col ${XLSX.utils.encode_col(c)}: "${rawText}"`,
              severity: "WARNING",
            });
            continue;
          }

          // Effective room code: altRoom overrides row's baseRoomCode
          const effectiveRoom = parsedCell.altRoom || baseRoomCode;

          if (!effectiveRoom) {
            warnings.push({
              sheetName,
              row: r,
              col: c,
              message: `Row ${r} (${semesterLabel || "Unknown Semester"}) has no room assigned for "${rawText}"`,
              severity: "INFO",
            });
          }

          entries.push({
            sheetName,
            dayOfWeek: sec.dayOfWeek,
            startTime: time.startTime,
            endTime: time.endTime,
            semesterLabel,
            roomCode: effectiveRoom,
            baseRoomCode,
            altRoomCode: parsedCell.altRoom,
            subjectCode: parsedCell.subjectCode,
            subjectName: parsedCell.subjectName,
            facultyCodes: parsedCell.facultyCodes,
            classType: parsedCell.classType,
            rawContent: rawText,
            sourceRow: r,
            sourceStartCol: c,
            sourceEndCol: endCol,
          });

          sheetEntryCount++;
        }
      }
    }

    sheetsParsed.push(sheetName);
    sheetStats[sheetName] = {
      entriesCount: sheetEntryCount,
      daySections: detectedDays,
    };
  }

  return {
    entries,
    teachers,
    sheetsParsed,
    metadata: {
      totalEntriesParsed: entries.length,
      sheetStats,
    },
    warnings,
    errors,
  };
}
