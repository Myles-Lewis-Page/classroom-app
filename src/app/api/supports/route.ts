import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, supportTypeId, selectedOptionId?, notes? } - checks a
// support on for a student (upsert - checking again just updates the
// selected option/notes rather than erroring).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const support = await prisma.studentSupport.upsert({
    where: {
      studentId_supportTypeId: {
        studentId: body.studentId,
        supportTypeId: body.supportTypeId,
      },
    },
    update: {
      selectedOptionId: body.selectedOptionId || null,
      notes: body.notes || null,
    },
    create: {
      studentId: body.studentId,
      supportTypeId: body.supportTypeId,
      selectedOptionId: body.selectedOptionId || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(support, { status: 201 });
}

// DELETE ?studentId=xxx&supportTypeId=yyy - unchecks a support for a student
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  const supportTypeId = req.nextUrl.searchParams.get("supportTypeId");
  if (!studentId || !supportTypeId) {
    return NextResponse.json({ error: "studentId and supportTypeId required" }, { status: 400 });
  }

  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.studentSupport.deleteMany({ where: { studentId, supportTypeId } });
  return NextResponse.json({ ok: true });
}
