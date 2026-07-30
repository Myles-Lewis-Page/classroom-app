import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { finishUnitEarly } from "@/lib/pacing";

// POST - marks a unit done early: trims trailing not-yet-progressed days
// (always keeping at least Day 1), snaps the unit's own endDate to match,
// and cascades every later unit up to fill the freed school days.
export async function POST(
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

  const result = await finishUnitEarly(id);

  const updated = await prisma.pacingUnit.findUnique({
    where: { id },
    include: {
      days: { orderBy: { dayNumber: "asc" }, include: { periodStatuses: true } },
      unitSummatives: { orderBy: { date: "asc" } },
      unitTopics: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ ...result, unit: updated });
}
