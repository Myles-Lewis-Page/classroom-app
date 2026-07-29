import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET /api/reports/weekly?start=2026-07-20&end=2026-07-24
// Returns a per-student aggregated report for the given date range.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ start: null, end: null, reports: [] });

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");

  const start = startParam ? new Date(startParam) : startOfWeek(new Date());
  const end = endParam ? new Date(endParam) : new Date(start.getTime() + 4 * 86400000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const students = await prisma.student.findMany({
    where: { isActive: true, classroomId },
    include: { parents: true },
  });

  const reports = await Promise.all(
    students.map(async (student) => {
      const [attendance, behavior, homework, observations, praiseNotes, missingEvents] =
        await Promise.all([
          prisma.attendanceEntry.findMany({
            where: { studentId: student.id, date: { gte: start, lte: end } },
          }),
          prisma.behaviorEntry.findMany({
            where: { studentId: student.id, date: { gte: start, lte: end } },
            include: { subject: true },
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
            where: { studentId: student.id, slipStatus: "missing" },
            include: { event: true },
          }),
        ]);

      const absences = attendance.filter((a) => a.status === "absent").length;
      const ratingCounts = { green: 0, yellow: 0, red: 0 };
      behavior.forEach((b) => {
        if (b.rating && b.rating in ratingCounts) {
          ratingCounts[b.rating as keyof typeof ratingCounts]++;
        }
      });

      return {
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        parentEmail: student.parents.find((p) => p.email)?.email ?? null,
        absences,
        totalDaysTracked: attendance.length,
        ratingCounts,
        behaviorComments: behavior.filter((b) => b.comment).map((b) => ({
          subject: b.subject.name,
          comment: b.comment,
        })),
        homework,
        observations,
        praiseNotes,
        missingEvents: missingEvents.map((e) => e.event.name),
      };
    })
  );

  return NextResponse.json({ start, end, reports });
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  date.setDate(date.getDate() + diff);
  return date;
}
