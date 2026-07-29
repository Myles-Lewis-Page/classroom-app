import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

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

// GET - single unit with its day rows
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const unit = await prisma.pacingUnit.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(unit);
}

// PATCH { name?, startDate?, endDate?, standards?, topics?, summatives?, datesToRemember? }
// If startDate/endDate change, day rows are regenerated to match the new
// range (existing lesson plan details for days outside the new range are
// lost - this is a deliberate simplification, the teacher just re-fills any
// days that shift).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const unit = await prisma.pacingUnit.findUnique({ where: { id } });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    standards?: string | null;
    topics?: string | null;
    summatives?: string | null;
    datesToRemember?: string | null;
    startDate?: Date;
    endDate?: Date;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.standards !== undefined) data.standards = body.standards || null;
  if (body.topics !== undefined) data.topics = body.topics || null;
  if (body.summatives !== undefined) data.summatives = body.summatives || null;
  if (body.datesToRemember !== undefined) data.datesToRemember = body.datesToRemember || null;

  let datesChanged = false;
  let newStart = unit.startDate;
  let newEnd = unit.endDate;
  if (body.startDate !== undefined) {
    newStart = new Date(body.startDate);
    data.startDate = newStart;
    datesChanged = true;
  }
  if (body.endDate !== undefined) {
    newEnd = new Date(body.endDate);
    data.endDate = newEnd;
    datesChanged = true;
  }

  const updated = await prisma.pacingUnit.update({ where: { id }, data });

  if (datesChanged) {
    await prisma.pacingUnitDay.deleteMany({ where: { pacingUnitId: id } });
    const days = weekdaysBetween(newStart, newEnd);
    await prisma.pacingUnitDay.createMany({
      data: days.map((d) => ({ pacingUnitId: id, date: d })),
    });
  }

  const withDays = await prisma.pacingUnit.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(withDays);
}

// DELETE - removes the unit entirely (cascades to its day rows)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const unit = await prisma.pacingUnit.findUnique({ where: { id } });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.pacingUnit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
