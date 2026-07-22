import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { tagId } - add tag to student
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  const studentTag = await prisma.studentTag.upsert({
    where: { studentId_tagId: { studentId: id, tagId: body.tagId } },
    update: {},
    create: { studentId: id, tagId: body.tagId },
  });

  return NextResponse.json(studentTag, { status: 201 });
}

// DELETE ?tagId=xxx - remove tag from student
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tagId = req.nextUrl.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });

  await prisma.studentTag.delete({
    where: { studentId_tagId: { studentId: id, tagId } },
  });

  return NextResponse.json({ ok: true });
}
