import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { grade, label, schoolName?, periodNames?: string[] } - creates an
// ADDITIONAL, genuinely separate classroom for the teacher (its own roster,
// subjects, grading setup - not a Period) without touching or archiving the
// current one. `label` disambiguates it from the teacher's other classrooms
// in the naming convention, e.g. "MPage-4th (Homeroom)". Optionally seeds
// initial Periods (Sections) under the new classroom, same as first-time
// setup. Makes the new classroom active.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const grade = (body.grade ?? "").trim();
  const label = (body.label ?? "").trim();
  const schoolName = (body.schoolName ?? "").trim();
  const periodNames: string[] = Array.isArray(body.periodNames)
    ? body.periodNames.map((n: string) => n.trim()).filter(Boolean)
    : [];

  if (!grade || !label) {
    return NextResponse.json({ error: "grade and label are required" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const nameParts = teacher.name.trim().split(" ");
  const firstInitial = (nameParts[0]?.[0] ?? "T").toUpperCase();
  const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Teacher";
  const classroomName = `${firstInitial}${lastName}-${grade} (${label})`;

  const now = new Date();
  const schoolYear =
    now.getMonth() >= 6
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

  const classroom = await prisma.classroom.create({
    data: { teacherId, name: classroomName, schoolYear, schoolName: schoolName || null },
  });

  await prisma.gradeCategory.createMany({
    data: [
      { classroomId: classroom.id, name: "Classwork", weight: 20, order: 0 },
      { classroomId: classroom.id, name: "Homework", weight: 30, order: 1 },
      { classroomId: classroom.id, name: "Tests", weight: 50, order: 2 },
    ],
  });

  if (periodNames.length > 0) {
    await prisma.section.createMany({
      data: periodNames.map((name, i) => ({ classroomId: classroom.id, name, order: i })),
      skipDuplicates: true,
    });
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { activeClassroomId: classroom.id },
  });

  return NextResponse.json({ classroom });
}
