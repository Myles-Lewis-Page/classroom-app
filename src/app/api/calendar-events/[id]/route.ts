import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { recomputeUnitDayDates, captureUnitDayState, cascadeAfterChange } from "@/lib/pacing";

// DELETE - removes one calendar entry. If it was a "holiday" (full day
// off), every unit's day dates are recomputed afterward, since removing a
// break can free up instructional slots that were being skipped.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!classroomId || !event || event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.calendarEvent.delete({ where: { id } });

  if (event.type === "holiday" || event.type === "teacher_work_day") {
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

  return NextResponse.json({ ok: true });
}
