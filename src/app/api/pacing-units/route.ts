import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly, formatShortDate } from "@/lib/dateOnly";
import { generateInstructionalDates, getHolidayRanges, findOverlappingUnit } from "@/lib/pacing";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const units = await prisma.pacingUnit.findMany({
    where: { classroomId },
    include: { days: { orderBy: { dayNumber: "asc" } }, unitTopics: { orderBy: { order: "asc" } } },
    orderBy: [{ order: "asc" }, { startDate: "asc" }],
  });

  return NextResponse.json(units);
}

// POST { name, startDate, endDate, standards?, topics? }
// Creates the unit and auto-generates one PacingUnitDay per instructional
// weekday in range (weekends and full days-off from the school calendar are
// skipped).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const startDate = parseDateOnly(body.startDate);
  const endDate = parseDateOnly(body.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Valid start and end dates are required" }, { status: 400 });
  }

  const overlap = await findOverlappingUnit(classroomId, startDate, endDate);
  if (overlap) {
    return NextResponse.json(
      {
        error: `That overlaps "${overlap.name}" (${formatShortDate(overlap.startDate)} - ${formatShortDate(
          overlap.endDate
        )}). Units can't overlap - adjust the dates or edit that unit first.`,
      },
      { status: 409 }
    );
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

  // Rough day count from the requested range - this is just the initial
  // generation; it can grow later (topics running long, half-completed
  // days) via ensureDayCount/recomputeUnitDayDates.
  const holidays = await getHolidayRanges(classroomId);
  const roughDates = generateInstructionalDates(
    startDate,
    // upper bound on how many weekdays could possibly fit in the range
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
    holidays
  ).filter((d) => d <= endDate);

  await prisma.pacingUnitDay.createMany({
    data: roughDates.map((d, i) => ({ pacingUnitId: unit.id, dayNumber: i + 1, date: d })),
  });

  const withDays = await prisma.pacingUnit.findUnique({
    where: { id: unit.id },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  return NextResponse.json(withDays, { status: 201 });
}
