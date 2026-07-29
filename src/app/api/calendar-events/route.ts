import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";
import { recomputeUnitDayDates } from "@/lib/pacing";

// GET - every calendar entry (days off, half days, and other reminders) for
// the active classroom, used by both the standalone School Calendar page
// and the Pacing Guide's per-unit "Dates to Remember" + grayed-out days.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const events = await prisma.calendarEvent.findMany({
    where: { classroomId },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

// POST { name, startDate, endDate?, type } - type is "holiday" | "half_day" | "other"
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const type = ["holiday", "half_day", "other"].includes(body.type) ? body.type : "other";
  if (!name || !body.startDate) {
    return NextResponse.json({ error: "name and startDate are required" }, { status: 400 });
  }

  const startDate = parseDateOnly(body.startDate);
  const endDate = body.endDate ? parseDateOnly(body.endDate) : startDate;

  const event = await prisma.calendarEvent.create({
    data: { classroomId, name, startDate, endDate, type },
  });

  if (type === "holiday") {
    const units = await prisma.pacingUnit.findMany({ where: { classroomId }, select: { id: true } });
    for (const u of units) {
      await recomputeUnitDayDates(u.id);
    }
  }

  return NextResponse.json(event, { status: 201 });
}
