import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET ?eventId=xxx - public event info + the student roster to pick from.
// No auth check - this route is meant to be reachable via a link shared
// directly with parents. Deliberately returns the bare minimum: event
// name/date and each student's id + first/last name only - nothing else
// about the student (no allergies, IEP, contact info, grades, etc.).
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { sections: { select: { id: true } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sectionIds = event.sections.map((s) => s.id);
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      classroomId: event.classroomId,
      ...(sectionIds.length > 0 ? { sectionId: { in: sectionIds } } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({
    event: { id: event.id, name: event.name, date: event.date },
    students,
  });
}

// POST { eventId, studentId, parentName, contactInfo, note? } - records
// interest only. Does NOT create an EventChaperone - the teacher reviews
// these and adds a real chaperone herself after reaching out.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const eventId = body.eventId as string;
  const studentId = body.studentId as string;
  const parentName = (body.parentName ?? "").trim();
  const contactInfo = (body.contactInfo ?? "").trim();
  const note = (body.note ?? "").trim();

  if (!eventId || !studentId || !parentName || !contactInfo) {
    return NextResponse.json(
      { error: "eventId, studentId, parentName, and contactInfo are all required" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Confirm the student actually belongs to this event's classroom - a
  // public route has to validate this itself, there's no session to lean on.
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.classroomId !== event.classroomId) {
    return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
  }

  await prisma.chaperoneInterest.create({
    data: { eventId, studentId, parentName, contactInfo, note: note || null },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
