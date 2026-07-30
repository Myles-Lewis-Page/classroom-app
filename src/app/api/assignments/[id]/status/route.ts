import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";

// POST { studentId, status, submittedDate? } - SUBMISSION status only
// ("missing" or "handed_in"). Upserts by (assignmentId, studentId). Setting
// "handed_in" records submittedAt, used elsewhere to flag late submissions.
//
// submittedDate is the teacher's own local calendar date ("YYYY-MM-DD",
// captured client-side), not the server's clock - dueDate is a date-only
// value with no time-of-day, so comparing it against the server's precise
// timestamp (which could be hours off from the teacher's actual day,
// especially late in the evening or if the server runs in a different
// timezone) was marking on-time submissions as a day or more late. Falls
// back to the server's own date only if the client didn't send one.
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

  const submittedAt =
    body.status === "handed_in"
      ? body.submittedDate
        ? parseDateOnly(body.submittedDate)
        : new Date()
      : undefined;

  const entry = await prisma.homeworkEntry.upsert({
    where: {
      assignmentId_studentId: { assignmentId: id, studentId: body.studentId },
    },
    update: {
      status: body.status,
      ...(submittedAt ? { submittedAt } : {}),
    },
    create: {
      assignmentId: id,
      studentId: body.studentId,
      status: body.status,
      submittedAt: submittedAt ?? null,
    },
  });

  return NextResponse.json(entry);
}
