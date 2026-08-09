import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";
import { getOrCreateDraft, getUpcomingEvents, getEventsInWeek } from "@/lib/newsletter";
import { getUpcomingSpellingList } from "@/lib/spelling";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";
import { getStudentWeeklyReport, startOfWeek } from "@/lib/weeklyReport";
import { renderStudentReportPdf } from "@/lib/reportPdf";
import { formatShortDate } from "@/lib/dateOnly";

// GET ?studentId=xxx&start=...&end=... - one student's Weekly Report as a
// single downloadable PDF, with the classroom newsletter (if there's
// anything in the draft) as its first page. This is the "download it all
// in one file" alternative to the mailto: Email button, which can only
// ever be plain text with no attachment.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!classroomId || !studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }
  if (!(await studentBelongsToClassroom(studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");
  const start = startParam ? new Date(startParam) : startOfWeek(new Date());
  const end = endParam ? new Date(endParam) : new Date(start.getTime() + 4 * 86400000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parents: true },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const weekLabel = `Week of ${formatShortDate(start)}`;

  const [report, draft, classroom, upcomingEvents, thisWeekEvents, shortfalls, upcomingSpellingList] =
    await Promise.all([
      getStudentWeeklyReport(student, start, end),
      getOrCreateDraft(classroomId),
      prisma.classroom.findUnique({ where: { id: classroomId }, select: { name: true } }),
      getUpcomingEvents(classroomId),
      getEventsInWeek(classroomId),
      getChaperoneShortfalls(classroomId),
      getUpcomingSpellingList(classroomId),
    ]);

  const pdfBuffer = await renderStudentReportPdf({
    report,
    weekLabel,
    newsletter: {
      classroomName: classroom?.name ?? "Our Classroom",
      bannerTitle: draft.bannerTitle,
      bannerSubtitle: draft.bannerSubtitle,
      themeMonth: draft.themeMonth,
      blocks: draft.blocks,
      upcomingEvents,
      thisWeekEvents,
      shortfalls: shortfalls.map((s) => ({ ...s, link: chaperoneInterestUrl(s.id, baseUrl) })),
      upcomingSpellingWords: upcomingSpellingList?.words.map((w) => w.word) ?? [],
    },
  });

  const safeName = `${student.firstName}-${student.lastName}`.replace(/[^a-zA-Z0-9-]/g, "");
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="weekly-report-${safeName}-${formatShortDate(start).replace(/\//g, "-")}.pdf"`,
    },
  });
}
