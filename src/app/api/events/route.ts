import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const events = await prisma.event.findMany({
    where: { classroomId },
    include: { statuses: { include: { student: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
}

// POST { name, date, dueDate, requiresPayment, description }
// classroomId is derived from the session, never trusted from the client.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();

  const event = await prisma.event.create({
    data: {
      classroomId,
      name: body.name,
      date: new Date(body.date),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      requiresPayment: !!body.requiresPayment,
      description: body.description ?? null,
    },
  });

  // Auto-create a "missing" status row for every active student IN THIS
  // CLASSROOM ONLY - not every student in the whole database.
  const students = await prisma.student.findMany({ where: { isActive: true, classroomId } });
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
