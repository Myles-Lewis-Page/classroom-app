import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ students: [], relationships: [] });

  const students = await prisma.student.findMany({
    where: { isActive: true, classroomId },
    include: { seatingAssignment: true },
  });
  const relationships = await prisma.relationship.findMany({
    where: { type: "conflict", student: { classroomId } },
  });

  return NextResponse.json({ students, relationships });
}

// POST { studentId, posX, posY }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assignment = await prisma.seatingAssignment.upsert({
    where: { studentId: body.studentId },
    update: { posX: body.posX, posY: body.posY },
    create: { studentId: body.studentId, posX: body.posX, posY: body.posY },
  });

  return NextResponse.json(assignment);
}
