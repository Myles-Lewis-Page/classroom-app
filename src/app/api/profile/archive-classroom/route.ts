import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST {} - archives the current active classroom (keeps all its data
// intact and viewable, just marks it isArchived) and clears the teacher's
// activeClassroomId so they're prompted to set up a fresh classroom via the
// normal Profile form (name/grade/subjects) - same flow as first-time setup.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No active classroom to archive" }, { status: 400 });
  }

  await prisma.classroom.update({
    where: { id: classroomId },
    data: { isArchived: true },
  });

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { activeClassroomId: null },
  });

  return NextResponse.json({ ok: true });
}
