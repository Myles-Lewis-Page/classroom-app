import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const units = await prisma.pacingUnit.findMany({
    where: { classroomId },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: [{ order: "asc" }, { startDate: "asc" }],
  });

  return NextResponse.json(units);
}

function weekdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// POST { name, startDate, endDate, standards?, topics? }
// Creates the unit and auto-generates one PacingUnitDay per weekday in range.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Valid start and end dates are required" }, { status: 400 });
  }

  const count = await prisma.pacingUnit.count({ where: { classroomId } });

  const unit = await prisma.pacingUnit.create({
    data: {
      classroomId,
      name: body.name || `Unit ${count + 1}`,
      order: count,
      startDate,
      endDate,
      standards: body.standards || null,
      topics: body.topics || null,
    },
  });

  const days = weekdaysBetween(startDate, endDate);
  await prisma.pacingUnitDay.createMany({
    data: days.map((d) => ({ pacingUnitId: unit.id, date: d })),
  });

  const withDays = await prisma.pacingUnit.findUnique({
    where: { id: unit.id },
    include: { days: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(withDays, { status: 201 });
}
