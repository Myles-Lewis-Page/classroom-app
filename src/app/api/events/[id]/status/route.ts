import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { studentId, slipStatus?, paymentStatus?, confirmed? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const classroomId = await getCurrentClassroomId();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!classroomId || !event || event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = await prisma.eventStatus.update({
    where: { eventId_studentId: { eventId: id, studentId: body.studentId } },
    data: {
      ...(body.slipStatus ? { slipStatus: body.slipStatus } : {}),
      ...(body.paymentStatus !== undefined ? { paymentStatus: body.paymentStatus || null } : {}),
      ...(body.confirmed !== undefined ? { confirmed: !!body.confirmed } : {}),
    },
  });

  return NextResponse.json(status);
}
