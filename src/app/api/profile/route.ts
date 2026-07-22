import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  const classroom = await prisma.classroom.findFirst({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });
  const skillSubjects = classroom
    ? await prisma.skillSubject.findMany({
        where: { classroomId: classroom.id },
        orderBy: { order: "asc" },
      })
    : [];

  return NextResponse.json({ teacher, classroom, skillSubjects });
}

// POST { firstName, lastName, grade, subjects: string[] }
// Updates the teacher's name, creates (or renames) their classroom using the
// format first-initial + last name + "-" + grade (e.g. "MPage-4th"), and
// syncs the classroom's list of taught subjects (generic + custom) to match
// exactly what was submitted.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const grade = (body.grade ?? "").trim();
  const subjects: string[] = Array.isArray(body.subjects)
    ? body.subjects.map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (!firstName || !lastName || !grade) {
    return NextResponse.json(
      { error: "firstName, lastName, and grade are all required" },
      { status: 400 }
    );
  }

  const classroomName = `${firstName[0].toUpperCase()}${lastName}-${grade}`;

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { name: `${firstName} ${lastName}` },
  });

  const existing = await prisma.classroom.findFirst({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  // School year runs roughly July-June; if it's July or later, the school
  // year is "this year - next year", otherwise "last year - this year".
  const schoolYear =
    now.getMonth() >= 6
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

  const classroom = existing
    ? await prisma.classroom.update({
        where: { id: existing.id },
        data: { name: classroomName },
      })
    : await prisma.classroom.create({
        data: { teacherId, name: classroomName, schoolYear },
      });

  // Sync subjects: mark selected ones active (creating any brand-new ones),
  // and mark anything NOT selected as inactive. We never delete the
  // SkillSubject row itself - that would cascade-delete its skills and
  // students' progress just because a checkbox got unchecked. isActive just
  // controls whether it shows up as "selected" here and in the Skills tab.
  const existingSubjects = await prisma.skillSubject.findMany({
    where: { classroomId: classroom.id },
  });
  const existingByName = new Map(existingSubjects.map((s) => [s.name, s]));
  const selectedNames = new Set(subjects);

  const toCreate = subjects.filter((name) => !existingByName.has(name));
  if (toCreate.length > 0) {
    await prisma.skillSubject.createMany({
      data: toCreate.map((name, i) => ({
        classroomId: classroom.id,
        name,
        order: existingSubjects.length + i,
        isActive: true,
      })),
    });
  }

  // Re-activate any existing subject that's selected but was previously off
  const toReactivate = existingSubjects.filter((s) => selectedNames.has(s.name) && !s.isActive);
  for (const s of toReactivate) {
    await prisma.skillSubject.update({ where: { id: s.id }, data: { isActive: true } });
  }

  // Deactivate any existing subject that's no longer selected
  const toDeactivate = existingSubjects.filter((s) => !selectedNames.has(s.name) && s.isActive);
  for (const s of toDeactivate) {
    await prisma.skillSubject.update({ where: { id: s.id }, data: { isActive: false } });
  }

  const skillSubjects = await prisma.skillSubject.findMany({
    where: { classroomId: classroom.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ classroom, skillSubjects });
}
