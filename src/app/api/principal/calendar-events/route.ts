import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/roleScope";
import { parseDateOnly } from "@/lib/dateOnly";

// GET - every school-wide calendar entry for this Principal's School.
export async function GET() {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await prisma.calendarEvent.findMany({
    where: { schoolId: principal.schoolId },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

// POST { name, startDate, endDate?, type } - creates a school-wide entry,
// visible (read-only) to every Teacher at this School. type is "holiday" |
// "teacher_work_day" | "half_day" | "other".
export async function POST(req: NextRequest) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    data: { schoolId: principal.schoolId, name, startDate, endDate, type },
  });

  // Every classroom at this school needs its Pacing Guide day dates
  // recomputed if this is a day-off type, same as a Teacher's own local
  // entry does - a school-wide holiday affects every unit at every
  // classroom here, not just one.
  if (type === "holiday" || type === "teacher_work_day") {
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

  return NextResponse.json(event, { status: 201 });
}
