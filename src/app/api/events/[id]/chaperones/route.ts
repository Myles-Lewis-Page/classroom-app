import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, parentName, relationship, confirmed? } - one chaperone
// slot per student per event (@@unique on the model) - if that student
// already has a signup, this fails with 409 rather than creating a
// duplicate, which is what makes "don't attach if that kid's parents
// already signed up" automatic rather than something the UI has to police.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!classroomId || !event || event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const studentId = body.studentId as string;
  const parentName = (body.parentName ?? "").trim();
  const relationship = (body.relationship ?? "").trim();
  if (!studentId || !parentName || !relationship) {
    return NextResponse.json({ error: "studentId, parentName, and relationship are required" }, { status: 400 });
  }
  if (!(await studentBelongsToClassroom(studentId, classroomId))) {
    return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
  }

  const existing = await prisma.eventChaperone.findUnique({
    where: { eventId_studentId: { eventId: id, studentId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This student's family already has a chaperone signup for this event" },
      { status: 409 }
    );
  }

  const chaperone = await prisma.eventChaperone.create({
    data: { eventId: id, studentId, parentName, relationship, confirmed: !!body.confirmed },
    include: { student: true },
  });

  return NextResponse.json(chaperone, { status: 201 });
}
