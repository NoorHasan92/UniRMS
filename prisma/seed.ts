/**
 * UniRMS Seed Data
 *
 * Creates realistic university data including departments, programs,
 * faculty, resources, and schedule entries that demonstrate:
 * - Fully unused rooms
 * - Partially used rooms
 * - Fully occupied rooms
 * - Various utilization levels
 * - Realistic academic timetable patterns
 */

import { PrismaClient, type DayOfWeek } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding UniRMS database...\n");

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceBlock.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.timetableImport.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================
  // Users
  // ==========================================
  console.log("👤 Creating users...");
  const adminPassword = await hash("admin123", 12);
  const officialPassword = await hash("official123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Dr. Rajesh Kumar",
      email: "admin@university.edu",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      name: "Mrs. Priya Sharma",
      email: "registrar@university.edu",
      passwordHash: officialPassword,
      role: "OFFICIAL",
    },
  });

  await prisma.user.create({
    data: {
      name: "Mr. Anil Gupta",
      email: "pa.vc@university.edu",
      passwordHash: officialPassword,
      role: "OFFICIAL",
    },
  });

  // ==========================================
  // Departments
  // ==========================================
  console.log("🏛️  Creating departments...");
  const departments = await Promise.all([
    prisma.department.create({ data: { code: "CSE", name: "Computer Science & Engineering" } }),
    prisma.department.create({ data: { code: "ECE", name: "Electronics & Communication Engineering" } }),
    prisma.department.create({ data: { code: "EEN", name: "Electrical & Electronics Engineering" } }),
    prisma.department.create({ data: { code: "MEN", name: "Mechanical Engineering" } }),
    prisma.department.create({ data: { code: "CEN", name: "Civil Engineering" } }),
    prisma.department.create({ data: { code: "BIO", name: "Biotechnology" } }),
    prisma.department.create({ data: { code: "MBA", name: "Master of Business Administration" } }),
    prisma.department.create({ data: { code: "ENG", name: "English" } }),
    prisma.department.create({ data: { code: "PHY", name: "Physics" } }),
    prisma.department.create({ data: { code: "CHEM", name: "Chemistry" } }),
    prisma.department.create({ data: { code: "MATH", name: "Mathematics" } }),
    prisma.department.create({ data: { code: "OTHER", name: "Other" } }),
  ]);

  const deptMap = Object.fromEntries(departments.map((d) => [d.code, d]));

  // ==========================================
  // Programs
  // ==========================================
  console.log("📚 Creating programs...");
  const programs = await Promise.all([
    prisma.program.create({ data: { code: "BTECH", name: "B.Tech", departmentId: null, durationYears: 4 } }),
    prisma.program.create({ data: { code: "BCA", name: "BCA", departmentId: deptMap.CSE.id, durationYears: 3 } }),
    prisma.program.create({ data: { code: "MCA", name: "MCA", departmentId: deptMap.CSE.id, durationYears: 2 } }),
    prisma.program.create({ data: { code: "MTECH", name: "M.Tech", departmentId: null, durationYears: 2 } }),
    prisma.program.create({ data: { code: "BBA", name: "BBA", departmentId: deptMap.MBA.id, durationYears: 3 } }),
    prisma.program.create({ data: { code: "MBA", name: "MBA", departmentId: deptMap.MBA.id, durationYears: 2 } }),
    prisma.program.create({ data: { code: "BCOM", name: "B.Com", departmentId: null, durationYears: 3 } }),
    prisma.program.create({ data: { code: "PHD", name: "PhD", departmentId: null, durationYears: 5 } }),
  ]);

  const progMap = Object.fromEntries(programs.map((p) => [p.code, p]));

  // ==========================================
  // Faculty
  // ==========================================
  console.log("👨‍🏫 Creating faculty...");
  const facultyData = [
    { name: "Dr. Amit Singh", shortCode: "AS", departmentId: deptMap.CSE.id },
    { name: "Prof. Neha Verma", shortCode: "NV", departmentId: deptMap.CSE.id },
    { name: "Dr. Suresh Patel", shortCode: "SP", departmentId: deptMap.CSE.id },
    { name: "Prof. Kavita Rao", shortCode: "KR", departmentId: deptMap.CSE.id },
    { name: "Dr. Rahul Mehta", shortCode: "RM", departmentId: deptMap.ECE.id },
    { name: "Prof. Deepa Joshi", shortCode: "DJ", departmentId: deptMap.ECE.id },
    { name: "Dr. Vikram Reddy", shortCode: "VR", departmentId: deptMap.EEN.id },
    { name: "Prof. Anita Kumari", shortCode: "AK", departmentId: deptMap.MEN.id },
    { name: "Dr. Mohan Das", shortCode: "MD", departmentId: deptMap.PHY.id },
    { name: "Prof. Sunita Roy", shortCode: "SR", departmentId: deptMap.MATH.id },
    { name: "Dr. Karan Malhotra", shortCode: "KM", departmentId: deptMap.CSE.id },
    { name: "Prof. Ritu Agarwal", shortCode: "RA", departmentId: deptMap.MBA.id },
  ];

  const faculty = await Promise.all(
    facultyData.map((f) => prisma.faculty.create({ data: f }))
  );
  const facMap = Object.fromEntries(faculty.map((f) => [f.shortCode!, f]));

  // ==========================================
  // Subjects
  // ==========================================
  console.log("📖 Creating subjects...");
  const subjectData = [
    { code: "CS401", name: "Machine Learning", departmentId: deptMap.CSE.id },
    { code: "CS402", name: "Cloud Computing", departmentId: deptMap.CSE.id },
    { code: "CS403", name: "Computer Networks", departmentId: deptMap.CSE.id },
    { code: "CS301", name: "Database Systems", departmentId: deptMap.CSE.id },
    { code: "CS302", name: "Operating Systems", departmentId: deptMap.CSE.id },
    { code: "CS201", name: "Data Structures", departmentId: deptMap.CSE.id },
    { code: "CS202", name: "Object Oriented Programming", departmentId: deptMap.CSE.id },
    { code: "EC301", name: "Digital Signal Processing", departmentId: deptMap.ECE.id },
    { code: "EC302", name: "VLSI Design", departmentId: deptMap.ECE.id },
    { code: "EE301", name: "Power Systems", departmentId: deptMap.EEN.id },
    { code: "ME301", name: "Thermodynamics", departmentId: deptMap.MEN.id },
    { code: "PH101", name: "Engineering Physics", departmentId: deptMap.PHY.id },
    { code: "MA101", name: "Engineering Mathematics", departmentId: deptMap.MATH.id },
    { code: "MB201", name: "Marketing Management", departmentId: deptMap.MBA.id },
  ];

  const subjects = await Promise.all(
    subjectData.map((s) => prisma.subject.create({ data: s }))
  );
  const subMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  // ==========================================
  // Resources (Rooms)
  // ==========================================
  console.log("🏢 Creating resources...");
  const resourceData = [
    // Right Block - 7th Floor (CSE)
    { code: "RB-701", name: "CSE Classroom 701", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "701", departmentId: deptMap.CSE.id, capacity: 60 },
    { code: "RB-702", name: "CSE Classroom 702", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "702", departmentId: deptMap.CSE.id, capacity: 55 },
    { code: "RB-703", name: "ECE Classroom 703", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "703", departmentId: deptMap.ECE.id, capacity: 50 },
    { code: "RB-704", name: "ECE Lab 704", type: "LAB" as const, block: "RIGHT" as const, floor: 7, roomNumber: "704", departmentId: deptMap.ECE.id, capacity: 40, hasProjector: true, computerCount: 40 },
    { code: "RB-705", name: "CSE Lab 705", type: "LAB" as const, block: "RIGHT" as const, floor: 7, roomNumber: "705", departmentId: deptMap.CSE.id, capacity: 45, hasProjector: true, hasSmartBoard: true, computerCount: 45 },
    { code: "RB-706", name: "CSE Classroom 706", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "706", departmentId: deptMap.CSE.id, capacity: 60, hasProjector: true },
    { code: "RB-707", name: "EEN Classroom 707", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "707", departmentId: deptMap.EEN.id, capacity: 50 },
    { code: "RB-708", name: "CSE Classroom 708", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 7, roomNumber: "708", departmentId: deptMap.CSE.id, capacity: 60, hasProjector: true, hasSmartBoard: true },

    // Right Block - 6th Floor (MEN/CEN)
    { code: "RB-601", name: "MEN Classroom 601", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 6, roomNumber: "601", departmentId: deptMap.MEN.id, capacity: 50 },
    { code: "RB-602", name: "MEN Lab 602", type: "LAB" as const, block: "RIGHT" as const, floor: 6, roomNumber: "602", departmentId: deptMap.MEN.id, capacity: 35, computerCount: 30 },
    { code: "RB-603", name: "CEN Classroom 603", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 6, roomNumber: "603", departmentId: deptMap.CEN.id, capacity: 45 },
    { code: "RB-604", name: "CEN Classroom 604", type: "CLASSROOM" as const, block: "RIGHT" as const, floor: 6, roomNumber: "604", departmentId: deptMap.CEN.id, capacity: 55 },

    // Left Block - 5th Floor (Mixed)
    { code: "LB-501", name: "BIO Lab 501", type: "LAB" as const, block: "LEFT" as const, floor: 5, roomNumber: "501", departmentId: deptMap.BIO.id, capacity: 30, computerCount: 20 },
    { code: "LB-502", name: "PHY Lab 502", type: "LAB" as const, block: "LEFT" as const, floor: 5, roomNumber: "502", departmentId: deptMap.PHY.id, capacity: 35 },
    { code: "LB-503", name: "CHEM Lab 503", type: "LAB" as const, block: "LEFT" as const, floor: 5, roomNumber: "503", departmentId: deptMap.CHEM.id, capacity: 30 },
    { code: "LB-504", name: "MBA Classroom 504", type: "CLASSROOM" as const, block: "LEFT" as const, floor: 5, roomNumber: "504", departmentId: deptMap.MBA.id, capacity: 40, hasProjector: true },
    { code: "LB-505", name: "ENG Classroom 505", type: "CLASSROOM" as const, block: "LEFT" as const, floor: 5, roomNumber: "505", departmentId: deptMap.ENG.id, capacity: 50 },
  ];

  const resources = await Promise.all(
    resourceData.map((r) => prisma.resource.create({ data: r }))
  );
  const resMap = Object.fromEntries(resources.map((r) => [r.code, r]));

  // ==========================================
  // Schedules (Realistic timetable)
  // ==========================================
  console.log("📅 Creating schedule entries...\n");

  // Helper to create schedule entry
  const sched = (
    day: string,
    start: string,
    end: string,
    resourceCode: string,
    deptCode: string,
    progCode: string,
    year: number,
    subjectCode?: string,
    facultyCode?: string,
    section?: string
  ) => ({
    dayOfWeek: day as DayOfWeek,
    startTime: start,
    endTime: end,
    resourceId: resMap[resourceCode].id,
    departmentId: deptMap[deptCode].id,
    programId: progMap[progCode].id,
    year,
    section: section ?? null,
    subjectId: subjectCode ? subMap[subjectCode]?.id : null,
    facultyId: facultyCode ? facMap[facultyCode]?.id : null,
  });

  const scheduleEntries = [
    // ==========================================
    // RB-708: CSE 4th Year — PARTIALLY USED on most days
    // Wednesday: 3 classes (demonstrate partial usage with gaps)
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-708", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("MONDAY", "11:00", "13:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),
    sched("MONDAY", "14:00", "16:00", "RB-708", "CSE", "BTECH", 4, "CS403", "SP"),

    sched("TUESDAY", "09:00", "11:00", "RB-708", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("TUESDAY", "11:00", "13:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),
    sched("TUESDAY", "14:00", "15:00", "RB-708", "CSE", "BTECH", 4, "CS403", "SP"),

    sched("WEDNESDAY", "11:00", "13:00", "RB-708", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("WEDNESDAY", "14:00", "15:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),
    sched("WEDNESDAY", "16:00", "17:00", "RB-708", "CSE", "BTECH", 4, "CS403", "SP"),

    sched("THURSDAY", "09:00", "11:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),
    sched("THURSDAY", "11:00", "13:00", "RB-708", "CSE", "BTECH", 4, "CS403", "SP"),
    sched("THURSDAY", "14:00", "16:00", "RB-708", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("THURSDAY", "16:00", "18:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),

    sched("FRIDAY", "09:00", "11:00", "RB-708", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("FRIDAY", "11:00", "13:00", "RB-708", "CSE", "BTECH", 4, "CS403", "SP"),
    sched("FRIDAY", "14:00", "16:00", "RB-708", "CSE", "BTECH", 4, "CS402", "NV"),

    // ==========================================
    // RB-701: CSE 3rd Year — HEAVY usage
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("MONDAY", "11:00", "13:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("MONDAY", "14:00", "16:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("MONDAY", "16:00", "18:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),

    sched("TUESDAY", "09:00", "11:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("TUESDAY", "11:00", "13:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("TUESDAY", "14:00", "16:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),

    sched("WEDNESDAY", "09:00", "11:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("WEDNESDAY", "11:00", "13:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("WEDNESDAY", "14:00", "16:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),

    sched("THURSDAY", "09:00", "11:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("THURSDAY", "11:00", "13:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("THURSDAY", "14:00", "16:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),

    sched("FRIDAY", "09:00", "11:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("FRIDAY", "11:00", "13:00", "RB-701", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("FRIDAY", "14:00", "16:00", "RB-701", "CSE", "BTECH", 3, "CS302", "KM"),

    // ==========================================
    // RB-702: CSE 2nd Year — MODERATE usage
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-702", "CSE", "BTECH", 2, "CS201", "SP"),
    sched("MONDAY", "14:00", "16:00", "RB-702", "CSE", "BTECH", 2, "CS202", "NV"),

    sched("WEDNESDAY", "09:00", "11:00", "RB-702", "CSE", "BTECH", 2, "CS201", "SP"),
    sched("WEDNESDAY", "11:00", "13:00", "RB-702", "CSE", "BTECH", 2, "CS202", "NV"),

    sched("FRIDAY", "09:00", "11:00", "RB-702", "CSE", "BTECH", 2, "CS201", "SP"),

    // ==========================================
    // RB-604: VERY LOW usage — underutilized
    // Only Tuesday and Thursday, 1-2 hours
    // ==========================================
    sched("TUESDAY", "10:00", "12:00", "RB-604", "CEN", "BTECH", 3),
    sched("THURSDAY", "14:00", "15:30", "RB-604", "CEN", "BTECH", 2),

    // ==========================================
    // RB-705: CSE Lab — FULLY OCCUPIED on Monday
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-705", "CSE", "BTECH", 3, "CS301", "KR"),
    sched("MONDAY", "11:00", "13:00", "RB-705", "CSE", "BTECH", 4, "CS402", "NV"),
    sched("MONDAY", "13:00", "15:00", "RB-705", "CSE", "BTECH", 2, "CS201", "SP"),
    sched("MONDAY", "15:00", "17:00", "RB-705", "CSE", "BTECH", 3, "CS302", "KM"),
    sched("MONDAY", "17:00", "18:00", "RB-705", "CSE", "BCA", 2, "CS201"),

    sched("WEDNESDAY", "09:00", "12:00", "RB-705", "CSE", "BTECH", 4, "CS401", "AS"),
    sched("WEDNESDAY", "14:00", "17:00", "RB-705", "CSE", "BTECH", 3, "CS301", "KR"),

    // ==========================================
    // RB-703: ECE — Moderate
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-703", "ECE", "BTECH", 3, "EC301", "RM"),
    sched("MONDAY", "14:00", "16:00", "RB-703", "ECE", "BTECH", 3, "EC302", "DJ"),

    sched("TUESDAY", "09:00", "11:00", "RB-703", "ECE", "BTECH", 3, "EC301", "RM"),
    sched("TUESDAY", "11:00", "13:00", "RB-703", "ECE", "BTECH", 3, "EC302", "DJ"),
    sched("TUESDAY", "14:00", "16:00", "RB-703", "ECE", "BTECH", 4, "EC301", "RM"),

    sched("THURSDAY", "09:00", "11:00", "RB-703", "ECE", "BTECH", 3, "EC301", "RM"),
    sched("THURSDAY", "14:00", "16:00", "RB-703", "ECE", "BTECH", 3, "EC302", "DJ"),

    // ==========================================
    // RB-706: CSE — Light usage
    // ==========================================
    sched("TUESDAY", "09:00", "11:00", "RB-706", "CSE", "BCA", 2, "CS201"),
    sched("TUESDAY", "14:00", "16:00", "RB-706", "CSE", "BCA", 3, "CS301"),

    sched("THURSDAY", "10:00", "12:00", "RB-706", "CSE", "MCA", 1, "CS201"),

    // ==========================================
    // LB-504: MBA
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "LB-504", "MBA", "MBA", 1, "MB201", "RA"),
    sched("MONDAY", "14:00", "16:00", "LB-504", "MBA", "BBA", 2, "MB201", "RA"),

    sched("WEDNESDAY", "09:00", "11:00", "LB-504", "MBA", "MBA", 1, "MB201", "RA"),

    // ==========================================
    // LB-505: ENG — Nearly unused (only Monday)
    // ==========================================
    sched("MONDAY", "10:00", "11:00", "LB-505", "ENG", "BTECH", 1, undefined, undefined, "A"),

    // ==========================================
    // RB-601: MEN — Moderate
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-601", "MEN", "BTECH", 3, "ME301", "AK"),
    sched("MONDAY", "14:00", "16:00", "RB-601", "MEN", "BTECH", 2, "ME301", "AK"),

    sched("WEDNESDAY", "09:00", "11:00", "RB-601", "MEN", "BTECH", 3, "ME301", "AK"),
    sched("WEDNESDAY", "11:00", "13:00", "RB-601", "MEN", "BTECH", 2),

    sched("FRIDAY", "09:00", "11:00", "RB-601", "MEN", "BTECH", 3, "ME301", "AK"),

    // ==========================================
    // LB-502: PHY Lab — Moderate
    // ==========================================
    sched("TUESDAY", "09:00", "12:00", "LB-502", "PHY", "BTECH", 1, "PH101", "MD", "A"),
    sched("THURSDAY", "09:00", "12:00", "LB-502", "PHY", "BTECH", 1, "PH101", "MD", "B"),

    // ==========================================
    // RB-707: EEN — Light
    // ==========================================
    sched("MONDAY", "09:00", "11:00", "RB-707", "EEN", "BTECH", 3, "EE301", "VR"),
    sched("WEDNESDAY", "14:00", "16:00", "RB-707", "EEN", "BTECH", 3, "EE301", "VR"),
  ];

  // Note: RB-704, RB-602, RB-603, LB-501, LB-503 have NO schedule entries
  // These will be FULLY UNUSED on all days - demonstrating the key insight

  await prisma.schedule.createMany({
    data: scheduleEntries,
  });

  console.log(`✅ Created ${scheduleEntries.length} schedule entries`);

  // ==========================================
  // Sample Booking
  // ==========================================
  console.log("📋 Creating sample bookings...");
  await prisma.booking.create({
    data: {
      resourceId: resMap["RB-604"].id,
      date: new Date("2026-09-09"),
      startTime: "14:00",
      endTime: "16:00",
      title: "Faculty Development Workshop",
      departmentId: deptMap.CSE.id,
      notes: "Annual faculty development program",
      status: "RESERVED",
      createdById: admin.id,
    },
  });

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n========================================");
  console.log("🎉 Seed completed successfully!");
  console.log("========================================");
  console.log(`
📊 Summary:
  Users:        3 (1 admin, 2 officials)
  Departments:  ${departments.length}
  Programs:     ${programs.length}
  Faculty:      ${faculty.length}
  Subjects:     ${subjects.length}
  Resources:    ${resources.length}
  Schedules:    ${scheduleEntries.length}
  Bookings:     1

🔑 Login credentials:
  Admin:    admin@university.edu / admin123
  Official: registrar@university.edu / official123
  Official: pa.vc@university.edu / official123

📝 Key test data:
  FULLY UNUSED on all days: RB-704, RB-602, RB-603, LB-501, LB-503
  HEAVILY USED: RB-708, RB-701
  UNDERUTILIZED: RB-604 (only Tue+Thu, ~2hrs each)
  FULLY OCCUPIED Mon: RB-705 (9hrs of lab)
  NEARLY UNUSED: LB-505 (only Mon 1hr)
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
