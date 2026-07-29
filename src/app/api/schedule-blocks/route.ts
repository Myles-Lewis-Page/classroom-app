import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Deliberately teacher-scoped rather than classroom-scoped (see the schema
// comment on ScheduleBlock) - this is one unified daily schedule across
// every Period/class the teacher has, not a per-classroom list.
async function currentTeacherId() {
  const session = await auth();
  const teacherId = (session?.user as { id?: string } | undefined)?.id;
  return teacherId ?? null;
}

export async function GET() {
  const teacherId = await currentTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocks = await prisma.scheduleBlock.findMany({
    where: { teacherId },
    include: { classroom: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(blocks);
}

// POST { label, startTime, endTime, studentsInClass, classroomId? }
export async function POST(req: NextRequest) {
  const teacherId = await currentTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const label = (body.label ?? "").trim();
  const startTime = body.startTime;
  const endTime = body.endTime;
  if (!label || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return NextResponse.json({ error: "label, startTime, and endTime are required" }, { status: 400 });
  }

  // If a classroom is tagged, make sure it actually belongs to this teacher.
  let classroomId: string | null = body.classroomId || null;
  if (classroomId) {
    const owned = await prisma.classroom.findFirst({ where: { id: classroomId, teacherId } });
    if (!owned) classroomId = null;
  }

  const block = await prisma.scheduleBlock.create({
    data: {
      teacherId,
      label,
      startTime,
      endTime,
      studentsInClass: body.studentsInClass !== false,
      classroomId,
    },
    include: { classroom: { select: { id: true, name: true } } },
  });

  return NextResponse.json(block, { status: 201 });
}
