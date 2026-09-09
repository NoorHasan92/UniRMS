// ==========================================
// UniRMS Constants
// ==========================================

/** Default working hours for the university */
export const WORKING_HOURS = {
  start: "09:00",
  end: "18:00",
  totalMinutes: 540, // 9 hours
  totalHours: 9,
} as const;

/** Block display mapping */
export const BLOCK_LABELS: Record<string, string> = {
  LEFT: "Left Block",
  RIGHT: "Right Block",
} as const;

/** Block code prefixes */
export const BLOCK_CODES: Record<string, string> = {
  LEFT: "LB",
  RIGHT: "RB",
} as const;

/** Year labels */
export const YEAR_LABELS: Record<number, string> = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
} as const;

/** Semester to year mapping for timetable imports */
export const SEMESTER_TO_YEAR: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 4,
  8: 4,
} as const;

/** Resource type labels */
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CLASSROOM: "Classroom",
  LAB: "Lab",
  SEMINAR_HALL: "Seminar Hall",
  AUDITORIUM: "Auditorium",
  CONFERENCE_ROOM: "Conference Room",
  OTHER: "Other",
} as const;

/** Days of week in order */
export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

/** Day abbreviations */
export const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
} as const;

export const DAY_FULL_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
} as const;

/** Underutilization threshold (below this % is considered underutilized) */
export const UNDERUTILIZATION_THRESHOLD = 40;

/** Resource statuses */
export const RESOURCE_STATUS = {
  FULLY_UNUSED: "FULLY_UNUSED",
  PARTIALLY_USED: "PARTIALLY_USED",
  FULLY_OCCUPIED: "FULLY_OCCUPIED",
} as const;

export type ResourceStatus = (typeof RESOURCE_STATUS)[keyof typeof RESOURCE_STATUS];

/** Status display labels */
export const STATUS_LABELS: Record<string, string> = {
  FULLY_UNUSED: "Fully Unused",
  PARTIALLY_USED: "Partially Used",
  FULLY_OCCUPIED: "Fully Occupied",
  BUSY_NOW: "Busy Now",
  FREE_NOW: "Free Now",
} as const;

/** Status color classes for Tailwind */
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  FULLY_UNUSED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PARTIALLY_USED: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  FULLY_OCCUPIED: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  BUSY_NOW: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  FREE_NOW: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  RESERVED: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  CANCELLED: {
    bg: "bg-zinc-50 dark:bg-zinc-950/30",
    text: "text-zinc-500 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  MAINTENANCE: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
} as const;

export const NAV_ITEMS: {
  title: string;
  icon: string;
  href?: string;
  adminOnly?: boolean;
  children?: { title: string; href: string; adminOnly?: boolean }[];
}[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    title: "Resources",
    icon: "Building2",
    children: [
      { title: "All Resources", href: "/resources" },
      { title: "Availability", href: "/availability" },
      { title: "Maintenance", href: "/maintenance", adminOnly: true },
    ],
  },
  {
    title: "Schedules",
    icon: "Calendar",
    children: [
      { title: "Daily Schedule", href: "/schedules" },
      { title: "Conflicts", href: "/schedules/conflicts", adminOnly: true },
    ],
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: "BookOpen",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: "BarChart3",
  },
  {
    title: "AI Assistant",
    href: "/ai",
    icon: "MessageSquareText",
  },
  {
    title: "Administration",
    icon: "Settings",
    adminOnly: true,
    children: [
      { title: "Departments", href: "/departments" },
      { title: "Programs", href: "/admin/programs" },
      { title: "Faculty", href: "/admin/faculty" },
      { title: "Subjects", href: "/admin/subjects" },
      { title: "Users", href: "/admin/users" },
      { title: "Timetable Import", href: "/admin/timetable-import" },
      { title: "Audit Logs", href: "/admin/audit-logs" },
    ],
  },
];

/** Floors available */
export const FLOORS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Years available */
export const YEARS = [1, 2, 3, 4] as const;

/** Sections */
export const SECTIONS = ["A", "B"] as const;

/** Time slots (30 min intervals) */
export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});
