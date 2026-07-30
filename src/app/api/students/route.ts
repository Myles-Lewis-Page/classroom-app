import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { backfillHomeworkEntriesForStudent } from "@/lib/homeworkBackfill";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const students = await prisma.student.findMany({
    where: { isActive: true, classroomId },
    include: {
      tags: { include: { tag: true } },
      allergies: true,
      dietaryRestrictions: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();

  // classroomId is always derived from the session, never trusted from the
  // request body - otherwise a client could pass another teacher's id.
  const student = await prisma.student.create({
    data: {
      classroomId,
      sectionId: body.sectionId || null,
      firstName: body.firstName,
      lastName: body.lastName,
      grade: body.grade,
      section: body.section ?? null,
      dob: body.dob ? new Date(body.dob) : null,
      understandingLevel: body.understandingLevel ?? null,
    },
  });

  await backfillHomeworkEntriesForStudent(student.id, classroomId, student.sectionId);

  return NextResponse.json(student, { status: 201 });
}
