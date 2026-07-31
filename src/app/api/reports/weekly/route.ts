import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks } from "@/lib/newsletter";
import { getChaperoneShortfalls } from "@/lib/chaperones";

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

  // The newsletter block-builder's current draft, rendered live so the
  // Weekly Report always reflects whatever she's got so far - this is the
  // same rendering logic used to freeze the archive snapshot on Publish,
  // see src/lib/newsletter.ts.
  const draft = await getOrCreateDraft(classroomId);
  const newsletterContent = await renderNewsletterBlocks(draft.blocks, classroomId);

  const students = await prisma.student.findMany({
    where: { isActive: true, classroomId },
    include: { parents: true },
  });

  const reports = await Promise.all(
    students.map(async (student) => {
      const [attendance, behaviorNotes, homework, observations, praiseNotes, missingEvents] =
        await Promise.all([
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
        behaviorTags: behaviorNotes.map((b) => ({ type: b.type, tag: b.tag })),
        homework,
        observations,
        praiseNotes,
        missingEvents: missingEvents.map((e) => {
          const parts: string[] = [];
          if (e.slipStatus === "missing") parts.push("slip");
          if (e.paymentStatus === "unpaid") parts.push("payment");
          return {
            name: e.event.name,
            due: e.event.dueDate,
            what: parts.join(" & "),
          };
        }),
      };
    })
  );

  // Classroom-wide (not per-student) chaperone shortfall for any upcoming
  // event that's tracking a needed count - shown once at the top of the
  // report rather than nagged on every single student's section.
  const chaperoneShortfalls = await getChaperoneShortfalls(classroomId, start);

  return NextResponse.json({
    start,
    end,
    reports,
    chaperoneShortfalls,
    newsletterContent,
  });
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  date.setDate(date.getDate() + diff);
  return date;
}
