import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, status, note } - upserts by (assignmentId, studentId),
// so re-tagging a student always updates their existing entry instead of
// creating a duplicate row.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const classroomId = await getCurrentClassroomId();
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (
    !classroomId ||
    !assignment ||
    assignment.classroomId !== classroomId ||
    !(await studentBelongsToClassroom(body.studentId, classroomId))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const submittedAt = body.status === "handed_in" ? new Date() : undefined;

  const entry = await prisma.homeworkEntry.upsert({
    where: {
      assignmentId_studentId: { assignmentId: id, studentId: body.studentId },
    },
    update: {
      status: body.status,
      note: body.note ?? undefined,
      ...(submittedAt ? { submittedAt } : {}),
    },
    create: {
      assignmentId: id,
      studentId: body.studentId,
      status: body.status,
      note: body.note ?? null,
      submittedAt: submittedAt ?? null,
    },
  });

  return NextResponse.json(entry);
}
