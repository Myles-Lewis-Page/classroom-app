import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

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
