import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const subjects = await prisma.skillSubject.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(subjects);
}

// POST { name } - adds a subject to the current classroom (used by Profile
// page for generic + custom subjects, and available to add more later).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const count = await prisma.skillSubject.count({ where: { classroomId } });

  const subject = await prisma.skillSubject.upsert({
    where: { classroomId_name: { classroomId, name } },
    update: {},
    create: { classroomId, name, order: count },
  });

  return NextResponse.json(subject, { status: 201 });
}

// DELETE ?subjectId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });

  const subject = await prisma.skillSubject.findUnique({ where: { id: subjectId } });
  if (!classroomId || !subject || subject.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.skillSubject.delete({ where: { id: subjectId } });
  return NextResponse.json({ ok: true });
}
