import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { grade, periodLabel } - creates an ADDITIONAL classroom for the
// teacher (e.g. a second group/period) without touching or archiving the
// current one. Reuses the teacher's stored name for the classroom naming
// convention (FirstInitialLastName-Grade), with the period label appended
// so two groups don't end up with identical names, e.g. "JHauschildt-3rd
// (Group A)" and "JHauschildt-3rd (Group B)". Makes the new one active.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const grade = (body.grade ?? "").trim();
  const periodLabel = (body.periodLabel ?? "").trim();

  if (!grade || !periodLabel) {
    return NextResponse.json({ error: "grade and periodLabel are required" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const nameParts = teacher.name.trim().split(" ");
  const firstInitial = (nameParts[0]?.[0] ?? "T").toUpperCase();
  const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Teacher";
  const classroomName = `${firstInitial}${lastName}-${grade} (${periodLabel})`;

  const now = new Date();
  const schoolYear =
    now.getMonth() >= 6
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

  const classroom = await prisma.classroom.create({
    data: { teacherId, name: classroomName, schoolYear },
  });

  await prisma.gradeCategory.createMany({
    data: [
      { classroomId: classroom.id, name: "Classwork", weight: 20, order: 0 },
      { classroomId: classroom.id, name: "Homework", weight: 30, order: 1 },
      { classroomId: classroom.id, name: "Tests", weight: 50, order: 2 },
    ],
  });

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { activeClassroomId: classroom.id },
  });

  return NextResponse.json({ classroom });
}
