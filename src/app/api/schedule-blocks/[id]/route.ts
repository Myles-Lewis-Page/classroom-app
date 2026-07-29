import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function currentTeacherId() {
  const session = await auth();
  const teacherId = (session?.user as { id?: string } | undefined)?.id;
  return teacherId ?? null;
}

// PATCH { label?, startTime?, endTime?, studentsInClass?, classroomId? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherId = await currentTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.scheduleBlock.findUnique({ where: { id } });
  if (!existing || existing.teacherId !== teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    label?: string;
    startTime?: string;
    endTime?: string;
    studentsInClass?: boolean;
    classroomId?: string | null;
  } = {};

  if (body.label !== undefined) data.label = body.label.trim();
  if (body.startTime !== undefined) data.startTime = body.startTime;
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.studentsInClass !== undefined) data.studentsInClass = !!body.studentsInClass;
  if (body.classroomId !== undefined) {
    if (body.classroomId) {
      const owned = await prisma.classroom.findFirst({ where: { id: body.classroomId, teacherId } });
      data.classroomId = owned ? body.classroomId : null;
    } else {
      data.classroomId = null;
    }
  }

  const block = await prisma.scheduleBlock.update({
    where: { id },
    data,
    include: { classroom: { select: { id: true, name: true } } },
  });
  return NextResponse.json(block);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherId = await currentTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.scheduleBlock.findUnique({ where: { id } });
  if (!existing || existing.teacherId !== teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scheduleBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
