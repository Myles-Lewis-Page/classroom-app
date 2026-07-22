import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ month: { present: 0, absent: 0 }, ytd: { present: 0, absent: 0 } });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // School year start: July 1 of whichever year the school year began.
  const startOfSchoolYear =
    now.getMonth() >= 6
      ? new Date(now.getFullYear(), 6, 1)
      : new Date(now.getFullYear() - 1, 6, 1);

  const [monthEntries, ytdEntries] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: { date: { gte: startOfMonth }, student: { classroomId } },
      select: { status: true },
    }),
    prisma.attendanceEntry.findMany({
      where: { date: { gte: startOfSchoolYear }, student: { classroomId } },
      select: { status: true },
    }),
  ]);

  const count = (entries: { status: string }[]) => ({
    present: entries.filter((e) => e.status === "present").length,
    absent: entries.filter((e) => e.status === "absent").length,
  });

  return NextResponse.json({
    month: count(monthEntries),
    ytd: count(ytdEntries),
  });
}
