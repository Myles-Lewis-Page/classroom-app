import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, skillId, status }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = await prisma.studentSkillStatus.upsert({
    where: {
      studentId_skillId: { studentId: body.studentId, skillId: body.skillId },
    },
    update: { status: body.status },
    create: {
      studentId: body.studentId,
      skillId: body.skillId,
      status: body.status,
    },
  });

  return NextResponse.json(status);
}
