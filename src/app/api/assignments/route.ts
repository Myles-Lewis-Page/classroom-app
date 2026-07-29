import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET /api/assignments?subjectId=xxx (optional filter, like Skills)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const subjectId = req.nextUrl.searchParams.get("subjectId");

  const assignments = await prisma.assignment.findMany({
    where: { classroomId, ...(subjectId ? { skillSubjectId: subjectId } : {}) },
    include: {
      entries: true,
      skillSubject: true,
    },
    orderBy: { assignedDate: "desc" },
  });

  return NextResponse.json(assignments);
}

// POST { name, assignedDate, dueDate?, subjectId?, gradingType?, maxPoints? }
// classroomId derived from session. Creates the assignment and
// auto-creates a "missing" entry for every active student IN THIS
// CLASSROOM ONLY, matching the same pattern as Event Tracker.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const gradingType = body.gradingType === "points" ? "points" : "completion";

  const assignment = await prisma.assignment.create({
    data: {
      classroomId,
      name: body.name,
      assignedDate: new Date(body.assignedDate),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      skillSubjectId: body.subjectId || null,
      gradingType,
      maxPoints: gradingType === "points" ? Number(body.maxPoints) || 100 : null,
    },
  });

  const students = await prisma.student.findMany({ where: { isActive: true, classroomId } });
  await prisma.homeworkEntry.createMany({
    data: students.map((s) => ({
      assignmentId: assignment.id,
      studentId: s.id,
      status: "missing",
    })),
  });

  return NextResponse.json(assignment, { status: 201 });
}
