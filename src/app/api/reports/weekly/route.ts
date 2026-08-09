import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks } from "@/lib/newsletter";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { getStudentWeeklyReport, startOfWeek } from "@/lib/weeklyReport";

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

  const reports = await Promise.all(students.map((student) => getStudentWeeklyReport(student, start, end)));

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
