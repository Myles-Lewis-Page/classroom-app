import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const events = await prisma.event.findMany({
    where: { classroomId },
    include: { statuses: { include: { student: true } }, sections: true, chaperones: true },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
}

// POST { name, date, dueDate, requiresPayment, description }
// classroomId is derived from the session, never trusted from the client.
//
// Also syncs a linked entry into the School Calendar (type "other" -
// reminder only, doesn't skip instructional days on its own, since an event
// doesn't necessarily mean the whole class misses the whole day) so it
// shows up there and in the Pacing Guide's "Dates to Remember" for any unit
// whose range covers it - e.g. so a unit's plan makes it visible that
// students will be out on a field trip that week.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const date = parseDateOnly(body.date);

  // sectionIds: which Periods this event applies to. Empty/missing = the
  // whole classroom, same "no tag means everyone" convention as Assignments.
  const sectionIds: string[] = Array.isArray(body.sectionIds) ? body.sectionIds.filter(Boolean) : [];

  const calendarEvent = await prisma.calendarEvent.create({
    data: { classroomId, name: body.name, startDate: date, endDate: date, type: "other" },
  });

  const event = await prisma.event.create({
    data: {
      classroomId,
      name: body.name,
      date,
      dueDate: body.dueDate ? parseDateOnly(body.dueDate) : null,
      requiresPayment: !!body.requiresPayment,
      paymentAmount: body.requiresPayment && body.paymentAmount ? Number(body.paymentAmount) : null,
      chaperonesNeeded: body.chaperonesNeeded ? Number(body.chaperonesNeeded) : null,
      description: body.description ?? null,
      calendarEventId: calendarEvent.id,
      ...(sectionIds.length > 0 ? { sections: { connect: sectionIds.map((id) => ({ id })) } } : {}),
    },
  });

  // Auto-create a "missing" status row for every active student IN THIS
  // CLASSROOM ONLY - not every student in the whole database - and, if this
  // event is tagged to specific Periods, only for students in those Periods.
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      classroomId,
      ...(sectionIds.length > 0 ? { sectionId: { in: sectionIds } } : {}),
    },
  });
  await prisma.eventStatus.createMany({
    data: students.map((s) => ({
      eventId: event.id,
      studentId: s.id,
      slipStatus: "missing",
      paymentStatus: body.requiresPayment ? "unpaid" : null,
    })),
  });

  return NextResponse.json(event, { status: 201 });
}
