import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({
      absentToday: [],
      birthdaysToday: [],
      birthdaysThisWeek: [],
      homeworkNeedsHelp: [],
      missingEvents: [],
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [absentToday, students, homeworkNeedsHelp, missingEvents] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: { date: today, status: "absent", student: { classroomId } },
      include: { student: true },
    }),
    prisma.student.findMany({ where: { isActive: true, classroomId } }),
    prisma.homeworkEntry.findMany({
      where: {
        status: "needs_help",
        assignment: { assignedDate: today, classroomId },
      },
      include: { student: true, assignment: true },
    }),
    prisma.eventStatus.findMany({
      where: { slipStatus: "missing", event: { classroomId } },
      include: { student: true, event: true },
    }),
  ]);

  const birthdaysToday = students.filter((s) => {
    if (!s.dob) return false;
    const dob = new Date(s.dob);
    return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
  });

  const birthdaysThisWeek = students.filter((s) => {
    if (!s.dob) return false;
    const dob = new Date(s.dob);
    const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    return thisYearBday >= today && thisYearBday <= weekFromNow;
  });

  return NextResponse.json({
    absentToday,
    birthdaysToday,
    birthdaysThisWeek,
    homeworkNeedsHelp,
    missingEvents,
  });
}
