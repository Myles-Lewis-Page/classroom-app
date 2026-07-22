import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, relatedStudentId, type } - type: "works_well" | "conflict"
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();

  // Both students in the relationship must belong to the teacher's own
  // classroom - otherwise a relationship could link students across
  // different teachers' classes.
  if (
    !classroomId ||
    !(await studentBelongsToClassroom(body.studentId, classroomId)) ||
    !(await studentBelongsToClassroom(body.relatedStudentId, classroomId))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const relationship = await prisma.relationship.upsert({
    where: {
      studentId_relatedStudentId_type: {
        studentId: body.studentId,
        relatedStudentId: body.relatedStudentId,
        type: body.type,
      },
    },
    update: {},
    create: {
      studentId: body.studentId,
      relatedStudentId: body.relatedStudentId,
      type: body.type,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(relationship, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const relationships = await prisma.relationship.findMany({
    where: { student: { classroomId } },
  });
  return NextResponse.json(relationships);
}
