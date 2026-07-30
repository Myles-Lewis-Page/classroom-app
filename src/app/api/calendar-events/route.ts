import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET - every calendar entry for the active classroom: its own local ones,
// plus every school-wide one set by its Principal (if it has one) - merged
// together and tagged isSchoolWide so the client can show the Principal's
// entries as read-only.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { teacher: { select: { schoolId: true } } },
  });
  const schoolId = classroom?.teacher?.schoolId;

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [{ classroomId }, ...(schoolId ? [{ schoolId }] : [])],
    },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events.map((e) => ({ ...e, isSchoolWide: !!e.schoolId })));
}

// POST is disabled for Teachers - holidays/teacher work days/half days are
// now managed by the Principal for the whole school (see
// /api/principal/calendar-events). Kept as a route (rather than deleted)
// so it fails clearly instead of 404ing if anything still calls it.
export async function POST() {
  return NextResponse.json(
    { error: "Your principal manages the school calendar now - ask them to add this." },
    { status: 403 }
  );
}
