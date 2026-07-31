import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET - full detail for one event: student slip/payment/confirmed status,
// chaperone signups, tagged Periods, everything the detail page needs.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      statuses: { include: { student: true } },
      chaperones: { include: { student: true }, orderBy: { createdAt: "asc" } },
      sections: true,
    },
  });
  if (!event || !classroomId || event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

// PATCH { name?, date?, dueDate?, requiresPayment?, paymentAmount?,
//         description?, notes?, chaperonesNeeded? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || !classroomId || existing.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.requiresPayment !== undefined) data.requiresPayment = !!body.requiresPayment;
  if (body.paymentAmount !== undefined) {
    data.paymentAmount = body.paymentAmount === "" || body.paymentAmount === null ? null : Number(body.paymentAmount);
  }
  if (body.description !== undefined) data.description = body.description || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.chaperonesNeeded !== undefined) {
    data.chaperonesNeeded =
      body.chaperonesNeeded === "" || body.chaperonesNeeded === null ? null : Number(body.chaperonesNeeded);
  }

  const updated = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE - removes the event and its linked School Calendar entry, if any
// (there was no delete for events at all before this - added alongside the
// calendar sync so a removed event doesn't leave an orphaned reminder
// behind on the calendar).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || !classroomId || event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id } });
  if (event.calendarEventId) {
    await prisma.calendarEvent.delete({ where: { id: event.calendarEventId } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
