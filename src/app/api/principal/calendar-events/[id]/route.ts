import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/roleScope";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event || event.schoolId !== principal.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.calendarEvent.delete({ where: { id } });

  if (event.type === "holiday" || event.type === "teacher_work_day") {
    const { recomputeUnitDayDates, captureUnitDayState, cascadeAfterChange } = await import("@/lib/pacing");
    const classrooms = await prisma.classroom.findMany({
      where: { teacher: { schoolId: principal.schoolId } },
      select: { id: true },
    });
    for (const c of classrooms) {
      const units = await prisma.pacingUnit.findMany({
        where: { classroomId: c.id },
        select: { id: true },
        orderBy: { startDate: "asc" },
      });
      for (const u of units) {
        const before = await captureUnitDayState(u.id);
        await recomputeUnitDayDates(u.id);
        await cascadeAfterChange(u.id, before);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
