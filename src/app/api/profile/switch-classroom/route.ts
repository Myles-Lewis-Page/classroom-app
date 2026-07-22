import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { classroomId } - sets which of the teacher's own classrooms is
// "active" (the one every other page/API operates on).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const classroomId = body.classroomId as string | undefined;
  if (!classroomId) return NextResponse.json({ error: "classroomId required" }, { status: 400 });

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.teacherId !== teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { activeClassroomId: classroomId },
  });

  return NextResponse.json({ ok: true });
}
