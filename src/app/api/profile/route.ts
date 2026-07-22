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

  return NextResponse.json({ teacher, classroom });
}

// POST { firstName, lastName, grade }
// Updates the teacher's name and creates (or renames) their classroom using
// the format: first-initial + last name + "-" + grade, e.g. "MPage-4th".
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  if (!teacherId) return NextResponse.json({ error: "No teacher on session" }, { status: 400 });

  const body = await req.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const grade = (body.grade ?? "").trim();

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

  return NextResponse.json({ classroom });
}
