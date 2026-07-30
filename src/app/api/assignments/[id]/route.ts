import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      entries: {
        include: { student: true },
      },
    },
  });

  if (!assignment || !classroomId || assignment.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(assignment);
}

// PATCH { name?, assignedDate?, dueDate?, subjectId?, gradeCategoryId?, gradingType?, maxPoints?, latePenaltyPercentPerDay? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing || !classroomId || existing.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    assignedDate?: Date;
    dueDate?: Date | null;
    skillSubjectId?: string | null;
    gradeCategoryId?: string | null;
    gradingType?: string;
    maxPoints?: number | null;
    latePenaltyPercentPerDay?: number | null;
  } = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.assignedDate !== undefined) data.assignedDate = new Date(body.assignedDate);
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.subjectId !== undefined) data.skillSubjectId = body.subjectId || null;
  if (body.gradeCategoryId !== undefined) data.gradeCategoryId = body.gradeCategoryId || null;
  if (body.latePenaltyPercentPerDay !== undefined) {
    data.latePenaltyPercentPerDay =
      body.latePenaltyPercentPerDay !== "" && body.latePenaltyPercentPerDay !== null
        ? Number(body.latePenaltyPercentPerDay) || null
        : null;
  }

  const gradingType = body.gradingType === "points" ? "points" : body.gradingType === "completion" ? "completion" : undefined;
  if (gradingType) {
    data.gradingType = gradingType;
    data.maxPoints = gradingType === "points" ? Number(body.maxPoints) || existing.maxPoints || 100 : null;
  } else if (body.maxPoints !== undefined && existing.gradingType === "points") {
    data.maxPoints = Number(body.maxPoints) || existing.maxPoints;
  }

  const assignment = await prisma.assignment.update({ where: { id }, data });
  return NextResponse.json(assignment);
}

// DELETE - removes the assignment entirely (cascades to its HomeworkEntry rows)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || !classroomId || assignment.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
