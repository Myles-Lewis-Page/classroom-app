import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";
import { generateInstructionalDates, getHolidayRanges } from "@/lib/pacing";

// GET - single unit with its day rows, topics, and summatives
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
    include: {
      days: { orderBy: { dayNumber: "asc" } },
      unitSummatives: { orderBy: { date: "asc" } },
      unitTopics: { orderBy: { order: "asc" } },
    },
  });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(unit);
}

// PATCH { name?, startDate?, endDate?, standards?, topics? }
// If startDate/endDate change, day rows are regenerated to match the new
// range (existing lesson plan details for days outside the new range are
// lost) - the teacher just re-fills any days that shift. Topics get
// reapplied to the freshly generated days afterward so their auto-fill
// isn't lost.
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
    startDate?: Date;
    endDate?: Date;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.standards !== undefined) data.standards = body.standards || null;
  if (body.topics !== undefined) data.topics = body.topics || null;

  let datesChanged = false;
  let newStart = unit.startDate;
  let newEnd = unit.endDate;
  if (body.startDate !== undefined) {
    newStart = parseDateOnly(body.startDate);
    data.startDate = newStart;
    datesChanged = true;
  }
  if (body.endDate !== undefined) {
    newEnd = parseDateOnly(body.endDate);
    data.endDate = newEnd;
    datesChanged = true;
  }

  await prisma.pacingUnit.update({ where: { id }, data });

  if (datesChanged) {
    await prisma.pacingUnitDay.deleteMany({ where: { pacingUnitId: id } });
    const holidays = await getHolidayRanges(classroomId);
    const roughDates = generateInstructionalDates(
      newStart,
      Math.ceil((newEnd.getTime() - newStart.getTime()) / 86400000) + 1,
      holidays
    ).filter((d) => d <= newEnd);
    await prisma.pacingUnitDay.createMany({
      data: roughDates.map((d, i) => ({ pacingUnitId: id, dayNumber: i + 1, date: d })),
    });

    // Re-apply any existing topics' auto-fill onto the fresh day rows.
    const topics = await prisma.unitTopic.findMany({ where: { unitId: id }, orderBy: { order: "asc" } });
    const { applyTopicToDays } = await import("@/lib/pacing");
    for (const t of topics) {
      await applyTopicToDays(id, t.id);
    }
  }

  const withDays = await prisma.pacingUnit.findUnique({
    where: { id },
    include: {
      days: { orderBy: { dayNumber: "asc" } },
      unitSummatives: { orderBy: { date: "asc" } },
      unitTopics: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(withDays);
}

// DELETE - removes the unit entirely (cascades to its day rows, topics, summatives)
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
