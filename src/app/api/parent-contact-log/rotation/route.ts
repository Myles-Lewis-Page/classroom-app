import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

const WEEKLY_GOAL = 5;

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// GET - returns this week's progress toward the 5-positive-contact goal,
// plus a rotation queue: which students have been reached this month (for
// a "good behavior" call) and which still need one, ordered so the
// longest-since-contacted student comes first (so the rotation naturally
// gets through the whole class by month's end).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({
      weeklyGoal: WEEKLY_GOAL,
      weeklyCount: 0,
      contactedThisWeek: [],
      contactedThisMonth: [],
      needsContact: [],
    });
  }

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [students, positiveLogsAllTime] = await Promise.all([
    prisma.student.findMany({ where: { isActive: true, classroomId } }),
    prisma.parentContactLog.findMany({
      where: { reason: "positive", student: { classroomId } },
      orderBy: { date: "desc" },
      include: { student: true },
    }),
  ]);

  const weekLogs = positiveLogsAllTime.filter((l) => l.date >= weekStart);
  const monthLogs = positiveLogsAllTime.filter((l) => l.date >= monthStart);

  const contactedThisWeekIds = new Set(weekLogs.map((l) => l.studentId));
  const contactedThisMonthIds = new Set(monthLogs.map((l) => l.studentId));

  // Last positive-contact date per student (across all time), for rotation
  // ordering - students never contacted come first (oldest/never first).
  const lastContactByStudent = new Map<string, Date>();
  positiveLogsAllTime.forEach((l) => {
    if (!lastContactByStudent.has(l.studentId)) {
      lastContactByStudent.set(l.studentId, l.date); // first occurrence = most recent, since sorted desc
    }
  });

  const needsContact = students
    .filter((s) => !contactedThisMonthIds.has(s.id))
    .sort((a, b) => {
      const aDate = lastContactByStudent.get(a.id);
      const bDate = lastContactByStudent.get(b.id);
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1; // never contacted goes first
      if (!bDate) return 1;
      return aDate.getTime() - bDate.getTime(); // oldest contact first
    })
    .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));

  const contactedThisWeek = students
    .filter((s) => contactedThisWeekIds.has(s.id))
    .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));

  const contactedThisMonth = students
    .filter((s) => contactedThisMonthIds.has(s.id))
    .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));

  return NextResponse.json({
    weeklyGoal: WEEKLY_GOAL,
    weeklyCount: contactedThisWeekIds.size,
    contactedThisWeek,
    contactedThisMonth,
    needsContact,
  });
}
