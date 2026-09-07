/**
 * Time utility functions for the availability engine.
 * All times are in "HH:mm" string format (IST).
 */

/** Convert "HH:mm" string to total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Convert total minutes from midnight to "HH:mm" string */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Format "HH:mm" to "HH:mm AM/PM" for display */
export function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Calculate duration in minutes between two "HH:mm" times */
export function durationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/** Check if two time intervals overlap */
export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && bS < aE;
}

/**
 * Merge overlapping/adjacent time intervals.
 * Input intervals must have `start` and `end` in "HH:mm".
 * Returns merged intervals sorted by start time.
 */
export function mergeIntervals(
  intervals: { start: string; end: string }[]
): { start: string; end: string }[] {
  if (intervals.length === 0) return [];

  // Sort by start time
  const sorted = [...intervals].sort((a, b) =>
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const merged: { start: string; end: string }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const lastEnd = timeToMinutes(last.end);
    const currentStart = timeToMinutes(current.start);

    if (currentStart <= lastEnd) {
      // Overlapping or adjacent — extend
      const currentEnd = timeToMinutes(current.end);
      if (currentEnd > lastEnd) {
        last.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Get the day of week string (MONDAY, TUESDAY, etc.) from a Date object.
 */
export function getDayOfWeek(date: Date): string {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return days[date.getDay()];
}

/**
 * Get current time in "HH:mm" format (IST).
 */
export function getCurrentTimeIST(): string {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60; // in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  return minutesToTime(Math.floor(istMinutes));
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date for display: "Monday, 7 September 2026"
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
