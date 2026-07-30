import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  const classroomId = await getCurrentClassroomId();
  const classroom = classroomId
    ? await prisma.classroom.findUnique({ where: { id: classroomId } })
    : null;
  const skillSubjects = classroom
    ? await prisma.skillSubject.findMany({
        where: { classroomId: classroom.id },
        orderBy: { order: "asc" },
      })
    : [];
  // All of this teacher's classrooms (active + archived), for the
  // multi-classroom switcher on the Profile page - each with its Periods so
  // the switcher can show what's nested under each one.
  const allClassrooms = teacherId
    ? await prisma.classroom.findMany({
        where: { teacherId },
        include: { sections: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return NextResponse.json({ teacher, classroom, skillSubjects, allClassrooms });
}

// POST { firstName, lastName, className, subjects: string[], schoolName? }
// Updates the teacher's name, creates (or renames) their ACTIVE classroom
// using the format first-initial + last name + "-" + class name (e.g.
// "MPage-Homeroom", "MPage-Math Block"), and syncs the classroom's list of
// taught subjects (generic + custom) to match exactly what was submitted.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const className = (body.className ?? "").trim();
  const schoolName = (body.schoolName ?? "").trim();
  const subjects: string[] = Array.isArray(body.subjects)
    ? body.subjects.map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (!firstName || !lastName || !className) {
    return NextResponse.json(
      { error: "firstName, lastName, and className are all required" },
      { status: 400 }
    );
  }

  const classroomName = `${firstName[0].toUpperCase()}${lastName}-${className}`;

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { name: `${firstName} ${lastName}` },
  });

  const existingId = await getCurrentClassroomId();
  const existing = existingId ? await prisma.classroom.findUnique({ where: { id: existingId } }) : null;

  const now = new Date();
  const schoolYear =
    now.getMonth() >= 6
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

  const classroom = existing
    ? await prisma.classroom.update({
        where: { id: existing.id },
        data: { name: classroomName, schoolName: schoolName || null },
      })
    : await prisma.classroom.create({
        data: { teacherId, name: classroomName, schoolYear, schoolName: schoolName || null },
      });

  if (!existing) {
    await prisma.gradeCategory.createMany({
      data: [
        { classroomId: classroom.id, name: "Classwork", weight: 20, order: 0 },
        { classroomId: classroom.id, name: "Homework", weight: 30, order: 1 },
        { classroomId: classroom.id, name: "Tests", weight: 50, order: 2 },
      ],
    });
  }

  // If this teacher had no active classroom set yet, make this one active.
  await prisma.teacher.updateMany({
    where: { id: teacherId, activeClassroomId: null },
    data: { activeClassroomId: classroom.id },
  });

  // Sync subjects: mark selected ones active (creating any brand-new ones),
  // and mark anything NOT selected as inactive. We never delete the
  // SkillSubject row itself - that would cascade-delete its skills and
  // students' progress just because a checkbox got unchecked.
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

  const toReactivate = existingSubjects.filter((s) => selectedNames.has(s.name) && !s.isActive);
  for (const s of toReactivate) {
    await prisma.skillSubject.update({ where: { id: s.id }, data: { isActive: true } });
  }

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
