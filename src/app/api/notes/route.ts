import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { studentId, type: "observation" | "praise", note }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.type === "praise") {
    const note = await prisma.praiseNote.create({
      data: { studentId: body.studentId, note: body.note },
    });
    return NextResponse.json(note, { status: 201 });
  }

  const note = await prisma.observation.create({
    data: { studentId: body.studentId, note: body.note },
  });
  return NextResponse.json(note, { status: 201 });
}
