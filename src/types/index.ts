import { type ResourceStatus } from "@/lib/constants";

// ==========================================
// Availability Engine Types
// ==========================================

/** A time interval with start and end in "HH:mm" format */
export interface TimeInterval {
  start: string;
  end: string;
}

/** A scheduled interval with metadata about what occupies it */
export interface OccupiedInterval extends TimeInterval {
  type: "schedule" | "booking" | "maintenance";
  label?: string;
  departmentCode?: string;
  programName?: string;
  year?: number;
  section?: string;
  subjectName?: string;
  facultyName?: string;
}

/** Free interval with duration info */
export interface FreeInterval extends TimeInterval {
  durationMinutes: number;
  durationHours: number;
}

/** Complete daily availability status for a resource */
export interface ResourceDayStatus {
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  block: string;
  floor: number;
  departmentCode?: string;
  capacity: number;
  hasProjector?: boolean;
  hasSmartBoard?: boolean;
  computerCount?: number;
  date: string;
  dayOfWeek: string;
  status: ResourceStatus;
  scheduledMinutes: number;
  scheduledHours: number;
  utilizationPercent: number;
  occupiedIntervals: OccupiedInterval[];
  freeIntervals: FreeInterval[];
  continuousFreeSlots: FreeInterval[];
  longestFreeSlotMinutes: number;
  isCurrentlyBusy?: boolean;
  nextScheduledClass?: OccupiedInterval | null;
}

/** Filters for resource availability queries */
export interface AvailabilityFilters {
  date?: string;
  dayOfWeek?: string;
  block?: string;
  floor?: number;
  departmentId?: string;
  resourceType?: string;
  status?: ResourceStatus;
  minCapacity?: number;
  minContinuousFreeMinutes?: number;
}

/** Weekly utilization for a resource */
export interface WeeklyUtilization {
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  departmentCode?: string;
  block: string;
  floor: number;
  days: {
    [day: string]: {
      scheduledHours: number;
      utilizationPercent: number;
      status: ResourceStatus;
    };
  };
  averageUtilization: number;
  unusedDays: number;
  totalDays: number;
}

// ==========================================
// Dashboard Types
// ==========================================

export interface DashboardSummary {
  totalResources: number;
  fullyUnused: number;
  partiallyUsed: number;
  fullyOccupied: number;
  averageUtilization: number;
  availableForBooking: number;
  byBlock: { block: string; total: number; unused: number; utilization: number }[];
  byFloor: { floor: number; total: number; unused: number; utilization: number }[];
  byDepartment: { department: string; total: number; unused: number; utilization: number }[];
}

// ==========================================
// Schedule Conflict Types
// ==========================================

export type ConflictType = "RESOURCE" | "FACULTY" | "ACADEMIC_GROUP";

export interface ScheduleConflict {
  type: ConflictType;
  scheduleA: {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    resourceCode: string;
    label: string;
  };
  scheduleB: {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    resourceCode: string;
    label: string;
  };
  description: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// AI Types
// ==========================================

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AiToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AiToolResult {
  name: string;
  result: unknown;
}
