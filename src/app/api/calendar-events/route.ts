import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";
import { recomputeUnitDayDates, captureUnitDayState, cascadeAfterChange } from "@/lib/pacing";

// GET - every calendar entry for the active classroom: its own local ones,
// plus every school-wide one set by its Principal (if it has one) - merged
// together and tagged isSchoolWide so the client can show the Principal's
// entries as read-only.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { teacher: { select: { schoolId: true } } },
  });
  const schoolId = classroom?.teacher?.schoolId;

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [{ classroomId }, ...(schoolId ? [{ schoolId }] : [])],
    },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events.map((e) => ({ ...e, isSchoolWide: !!e.schoolId })));
}

// POST { name, startDate, endDate?, type } - type is "holiday" | "teacher_work_day" | "half_day" | "other"
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const validTypes = ["holiday", "teacher_work_day", "half_day", "other"];
  const type = validTypes.includes(body.type) ? body.type : "other";
  if (!name || !body.startDate) {
    return NextResponse.json({ error: "name and startDate are required" }, { status: 400 });
  }

  const startDate = parseDateOnly(body.startDate);
  const endDate = body.endDate ? parseDateOnly(body.endDate) : startDate;

  const event = await prisma.calendarEvent.create({
    data: { classroomId, name, startDate, endDate, type },
  });

  if (type === "holiday" || type === "teacher_work_day") {
    const units = await prisma.pacingUnit.findMany({
      where: { classroomId },
      select: { id: true },
      orderBy: { startDate: "asc" },
    });
    for (const u of units) {
      const before = await captureUnitDayState(u.id);
      await recomputeUnitDayDates(u.id);
      await cascadeAfterChange(u.id, before);
    }
  }

  return NextResponse.json(event, { status: 201 });
}
