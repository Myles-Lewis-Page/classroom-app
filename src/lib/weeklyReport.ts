import { prisma } from "@/lib/prisma";

export type StudentWeeklyReport = {
  studentId: string;
  name: string;
  parentEmail: string | null;
  absences: number;
  totalDaysTracked: number;
  behaviorCounts: { good: number; bad: number };
  behaviorTags: { type: "good" | "bad"; tag: string }[];
  homework: {
    assignment: { name: string };
    status: string;
    gradeStatus: string | null;
    gradeScore: number | null;
  }[];
  observations: { note: string }[];
  praiseNotes: { note: string }[];
  missingEvents: { name: string; due: Date | null; what: string }[];
};

/**
 * One student's aggregated weekly report data (attendance, behavior,
 * homework, observations, praise notes, missing event slips/payments) for
 * a date range - the single source of truth for this computation, used
 * by both the classroom-wide Weekly Report page and the per-student PDF
 * export, so the two can never drift out of sync with each other.
 */
export async function getStudentWeeklyReport(
  student: { id: string; firstName: string; lastName: string; parents: { email: string | null }[] },
  start: Date,
  end: Date
): Promise<StudentWeeklyReport> {
  const [attendance, behaviorNotes, homework, observations, praiseNotes, missingEvents] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: { studentId: student.id, date: { gte: start, lte: end } },
    }),
    prisma.behaviorNote.findMany({
      where: { studentId: student.id, date: { gte: start, lte: end } },
    }),
    prisma.homeworkEntry.findMany({
      where: { studentId: student.id, assignment: { assignedDate: { gte: start, lte: end } } },
      include: { assignment: true },
    }),
    prisma.observation.findMany({
      where: { studentId: student.id, date: { gte: start, lte: end } },
    }),
    prisma.praiseNote.findMany({
      where: { studentId: student.id, date: { gte: start, lte: end } },
    }),
    prisma.eventStatus.findMany({
      where: {
        studentId: student.id,
        OR: [{ slipStatus: "missing" }, { paymentStatus: "unpaid" }],
      },
      include: { event: true },
    }),
  ]);

  const absences = attendance.filter((a) => a.status === "absent").length;
  const behaviorCounts = {
    good: behaviorNotes.filter((b) => b.type === "good").length,
    bad: behaviorNotes.filter((b) => b.type === "bad").length,
  };

  return {
    studentId: student.id,
    name: `${student.firstName} ${student.lastName}`,
    parentEmail: student.parents.find((p) => p.email)?.email ?? null,
    absences,
    totalDaysTracked: attendance.length,
    behaviorCounts,
    behaviorTags: behaviorNotes.map((b) => ({ type: b.type as "good" | "bad", tag: b.tag })),
    homework,
    observations,
    praiseNotes,
    missingEvents: missingEvents.map((e) => {
      const parts: string[] = [];
      if (e.slipStatus === "missing") parts.push("slip");
      if (e.paymentStatus === "unpaid") parts.push("payment");
      return { name: e.event.name, due: e.event.dueDate, what: parts.join(" & ") };
    }),
  };
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  date.setDate(date.getDate() + diff);
  return date;
}
