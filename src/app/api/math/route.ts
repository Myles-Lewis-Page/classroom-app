import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ skills: [], statuses: [] });

  const skills = await prisma.mathSkill.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  const statuses = await prisma.studentMathStatus.findMany({
    where: { student: { classroomId } },
  });

  return NextResponse.json({ skills, statuses });
}

// POST { studentId, mathSkillId, status }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = await prisma.studentMathStatus.upsert({
    where: {
      studentId_mathSkillId: { studentId: body.studentId, mathSkillId: body.mathSkillId },
    },
    update: { status: body.status },
    create: {
      studentId: body.studentId,
      mathSkillId: body.mathSkillId,
      status: body.status,
    },
  });

  return NextResponse.json(status);
}
