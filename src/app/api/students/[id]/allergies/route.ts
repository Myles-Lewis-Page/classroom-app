import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// POST { allergen, severity, reaction, notes }
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

  const allergy = await prisma.allergy.create({
    data: {
      studentId: id,
      allergen: body.allergen,
      severity: body.severity,
      reaction: body.reaction || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(allergy, { status: 201 });
}

// DELETE ?allergyId=xxx
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

  const allergyId = req.nextUrl.searchParams.get("allergyId");
  if (!allergyId) return NextResponse.json({ error: "allergyId required" }, { status: 400 });

  await prisma.allergy.delete({ where: { id: allergyId } });
  return NextResponse.json({ ok: true });
}
