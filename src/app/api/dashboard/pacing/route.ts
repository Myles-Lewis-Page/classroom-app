import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { toDateInputValue } from "@/lib/dateOnly";

type TodayUnit = {
  unit: { id: string; name: string };
  day: {
    id: string;
    date: Date;
    topic: string | null;
    status: string;
    dayNumber: number;
  };
};

// GET - today's PacingUnitDay across every unit that has one scheduled for
// today (normally just one, since units aren't allowed to overlap, but this
// doesn't assume that) - lets the Dashboard show/update today's status
// directly without a trip to the Pacing Guide.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ units: [] });

  const todayKey = toDateInputValue(new Date());

  const units = await prisma.pacingUnit.findMany({
    where: { classroomId },
    include: { days: true },
  });

  const todayUnits: TodayUnit[] = [];
  for (const u of units) {
    const day = u.days.find((d) => toDateInputValue(d.date) === todayKey);
    if (day) {
      todayUnits.push({
        unit: { id: u.id, name: u.name },
        day: {
          id: day.id,
          date: day.date,
          topic: day.topic,
          status: day.status,
          dayNumber: day.dayNumber,
        },
      });
    }
  }

  return NextResponse.json({ units: todayUnits });
}
