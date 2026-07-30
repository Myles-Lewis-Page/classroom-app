import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { finishUnitEarly, finishUnitEarlyForSection } from "@/lib/pacing";

// POST { sectionId? } - marks a unit done early. With no sectionId (viewing
// "All Students"), this is the shared, whole-class action: trims trailing
// not-yet-progressed days, snaps the unit's own endDate to match, and
// cascades every later unit up. With a sectionId, it ONLY affects that one
// Period's own tracked pace - the shared schedule, other Periods, and later
// units are untouched.
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

  const body = await req.json().catch(() => ({}));
  let result: { removedDays?: number; savedDays?: number };
  if (body.sectionId) {
    const section = await prisma.section.findFirst({ where: { id: body.sectionId, classroomId } });
    if (!section) return NextResponse.json({ error: "Invalid sectionId" }, { status: 400 });
    result = await finishUnitEarlyForSection(id, body.sectionId);
  } else {
    result = await finishUnitEarly(id);
  }

  const updated = await prisma.pacingUnit.findUnique({
    where: { id },
    include: {
      days: { orderBy: { dayNumber: "asc" }, include: { periodStatuses: true } },
      periodOffsets: true,
      periodExtraDays: { orderBy: { date: "asc" }, include: { section: { select: { id: true, name: true } } } },
      unitSummatives: { orderBy: { date: "asc" } },
      unitTopics: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ ...result, unit: updated });
}
