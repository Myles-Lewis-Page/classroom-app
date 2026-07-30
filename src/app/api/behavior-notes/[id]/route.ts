import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// PATCH { type?, tag?, note?, subjectId? } - editing a note's own fields.
// To log/change a call about it, use POST /api/parent-contact-log with
// linkBehaviorNoteId instead - that's the single path that creates/links a
// ParentContactLog, so "called" never gets out of sync with the log itself.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const existing = await prisma.behaviorNote.findUnique({ where: { id }, include: { student: true } });
  if (!classroomId || !existing || existing.student.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: { type?: string; tag?: string; note?: string | null; subjectId?: string | null } = {};
  if (body.type !== undefined) data.type = body.type === "bad" ? "bad" : "good";
  if (body.tag !== undefined) data.tag = body.tag.trim();
  if (body.note !== undefined) data.note = body.note || null;
  if (body.subjectId !== undefined) data.subjectId = body.subjectId || null;

  const note = await prisma.behaviorNote.update({
    where: { id },
    data,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
      contactLog: true,
    },
  });
  return NextResponse.json(note);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const existing = await prisma.behaviorNote.findUnique({ where: { id }, include: { student: true } });
  if (!classroomId || !existing || existing.student.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.behaviorNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
