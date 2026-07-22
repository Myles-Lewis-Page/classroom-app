import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, literacySkillId, status }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = await prisma.studentLiteracyStatus.upsert({
    where: {
      studentId_literacySkillId: {
        studentId: body.studentId,
        literacySkillId: body.literacySkillId,
      },
    },
    update: { status: body.status },
    create: {
      studentId: body.studentId,
      literacySkillId: body.literacySkillId,
      status: body.status,
    },
  });

  return NextResponse.json(status);
}
