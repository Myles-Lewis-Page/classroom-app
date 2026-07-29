import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, gradeStatus? , gradeScore? }
// gradeStatus ("complete"/"incomplete") is used when the assignment's
// gradingType is "completion"; gradeScore (a number) is used when it's
// "points". Upserts by (assignmentId, studentId).
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

  const data: { gradeStatus?: string | null; gradeScore?: number | null } = {};
  if (assignment.gradingType === "points") {
    const score = body.gradeScore === "" || body.gradeScore === null ? null : Number(body.gradeScore);
    data.gradeScore = score;
  } else {
    data.gradeStatus = body.gradeStatus || null;
  }

  const entry = await prisma.homeworkEntry.upsert({
    where: {
      assignmentId_studentId: { assignmentId: id, studentId: body.studentId },
    },
    update: data,
    create: {
      assignmentId: id,
      studentId: body.studentId,
      status: "missing",
      ...data,
    },
  });

  return NextResponse.json(entry);
}
