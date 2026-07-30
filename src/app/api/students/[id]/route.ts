import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

export async function GET(
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

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      allergies: true,
      dietaryRestrictions: true,
      ieps: true,
      parents: true,
      relationshipsFrom: { include: { relatedStudent: true } },
      relationshipsTo: { include: { student: true } },
      observations: { orderBy: { date: "desc" }, take: 20 },
      praiseNotes: { orderBy: { date: "desc" }, take: 20 },
      attendanceEntries: { orderBy: { date: "desc" }, take: 30 },
      homeworkEntries: {
        where: { assignment: { handedOut: true } },
        orderBy: { assignment: { assignedDate: "desc" } },
        take: 30,
        include: { assignment: { include: { gradeCategory: true } } },
      },
      behaviorEntries: { orderBy: { date: "desc" }, take: 30, include: { subject: true } },
      behaviorNotes: {
        orderBy: { date: "desc" },
        take: 30,
        include: { subject: true, contactLog: true },
      },
      parentContactLogs: { orderBy: { date: "desc" }, take: 20 },
      supports: { include: { supportType: true, selectedOption: true } },
      skillStatuses: {
        where: { status: "5" },
        include: { skill: { include: { skillSubject: true } } },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(student);
}

export async function PATCH(
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

  const student = await prisma.student.update({
    where: { id },
    data: body,
  });

  // If the student was just removed from the class, free up their seat too
  // rather than leaving a "ghost" assignment behind.
  if (body.isActive === false) {
    await prisma.seatingAssignment.deleteMany({ where: { studentId: id } });
  }

  return NextResponse.json(student);
}
