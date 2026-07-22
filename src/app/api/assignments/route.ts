import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.assignment.findMany({
    include: {
      entries: true,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(assignments);
}

// POST { classroomId, name, date }
// Creates the assignment and auto-creates a "missing" entry for every active
// student, matching the same pattern as Event Tracker.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.classroomId) {
    return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
  }
  const classroom = await prisma.classroom.findUnique({ where: { id: body.classroomId } });
  if (!classroom) {
    return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      classroomId: body.classroomId,
      name: body.name,
      date: new Date(body.date),
    },
  });

  const students = await prisma.student.findMany({ where: { isActive: true } });
  await prisma.homeworkEntry.createMany({
    data: students.map((s) => ({
      assignmentId: assignment.id,
      studentId: s.id,
      status: "missing",
    })),
  });

  return NextResponse.json(assignment, { status: 201 });
}
