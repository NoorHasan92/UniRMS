import { z } from "zod";

// ==========================================
// Shared Validators
// ==========================================

/** Time in HH:mm format */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format");

/** Validate that endTime > startTime */
export const timeRangeSchema = z.object({
  startTime: timeSchema,
  endTime: timeSchema,
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "End time must be after start time", path: ["endTime"] }
);

// ==========================================
// Department
// ==========================================

export const departmentSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less").toUpperCase(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

// ==========================================
// Program
// ==========================================

export const programSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  departmentId: z.string().optional().nullable(),
  durationYears: z.number().int().min(1).max(6).default(4),
});

export type ProgramInput = z.infer<typeof programSchema>;

// ==========================================
// Faculty
// ==========================================

export const facultySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  shortCode: z.string().max(20).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

export type FacultyInput = z.infer<typeof facultySchema>;

// ==========================================
// Subject
// ==========================================

export const subjectSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  departmentId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

// ==========================================
// Resource
// ==========================================

export const resourceSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["CLASSROOM", "LAB", "SEMINAR_HALL", "AUDITORIUM", "CONFERENCE_ROOM", "OTHER"]),
  block: z.enum(["LEFT", "RIGHT"]),
  floor: z.number().int().min(1).max(8),
  roomNumber: z.string().min(1, "Room number is required"),
  departmentId: z.string().optional().nullable(),
  capacity: z.number().int().min(1).max(1000).default(40),
  description: z.string().max(500).optional().nullable(),
  hasProjector: z.boolean().default(false),
  hasSmartBoard: z.boolean().default(false),
  computerCount: z.number().int().min(0).default(0),
});

export type ResourceInput = z.infer<typeof resourceSchema>;

// ==========================================
// Schedule
// ==========================================

export const scheduleSchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
  startTime: timeSchema,
  endTime: timeSchema,
  resourceId: z.string().min(1, "Resource is required"),
  departmentId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  year: z.number().int().min(1).max(4).optional().nullable(),
  section: z.string().max(5).optional().nullable(),
  subjectId: z.string().optional().nullable(),
  facultyId: z.string().optional().nullable(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "End time must be after start time", path: ["endTime"] }
).refine(
  // Section only allowed for 1st year
  (data) => {
    if (data.section && data.year && data.year !== 1) {
      return false;
    }
    return true;
  },
  { message: "Section is only allowed for 1st Year", path: ["section"] }
);

export type ScheduleInput = z.infer<typeof scheduleSchema>;

// ==========================================
// Booking
// ==========================================

export const bookingSchema = z.object({
  resourceId: z.string().min(1, "Resource is required"),
  date: z.string().min(1, "Date is required"), // ISO date string
  startTime: timeSchema,
  endTime: timeSchema,
  title: z.string().min(1, "Title is required").max(200),
  departmentId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "End time must be after start time", path: ["endTime"] }
);

export type BookingInput = z.infer<typeof bookingSchema>;

// ==========================================
// Maintenance Block
// ==========================================

export const maintenanceBlockSchema = z.object({
  resourceId: z.string().min(1, "Resource is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type MaintenanceBlockInput = z.infer<typeof maintenanceBlockSchema>;

// ==========================================
// User
// ==========================================

export const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "OFFICIAL"]).default("OFFICIAL"),
});

export type UserInput = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// Availability Search
// ==========================================

export const availabilitySearchSchema = z.object({
  date: z.string().optional(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]).optional(),
  block: z.enum(["LEFT", "RIGHT"]).optional(),
  floor: z.number().int().min(1).max(8).optional(),
  departmentId: z.string().optional(),
  resourceType: z.enum(["CLASSROOM", "LAB", "SEMINAR_HALL", "AUDITORIUM", "CONFERENCE_ROOM", "OTHER"]).optional(),
  status: z.enum(["FULLY_UNUSED", "PARTIALLY_USED", "FULLY_OCCUPIED", "AVAILABLE"]).optional(),
  minCapacity: z.number().int().min(1).optional(),
  minContinuousFreeMinutes: z.number().int().min(30).optional(),
});

export type AvailabilitySearchInput = z.infer<typeof availabilitySearchSchema>;
