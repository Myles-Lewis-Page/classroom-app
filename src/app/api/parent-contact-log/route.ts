import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// GET /api/parent-contact-log?studentId=xxx (optional filter)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const studentId = req.nextUrl.searchParams.get("studentId");

  const logs = await prisma.parentContactLog.findMany({
    where: {
      student: { classroomId },
      ...(studentId ? { studentId } : {}),
    },
    include: { student: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(logs);
}

// POST { studentId, date, reason, method, comment, followUp, linkBehaviorNoteId? }
// If linkBehaviorNoteId is given, the new contact log entry gets attached to
// that BehaviorNote in the same transaction - that's the entire "mark as
// called" mechanism, so a note is "called" exactly when it has a linked log.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let linkNote: { id: string } | null = null;
  if (body.linkBehaviorNoteId) {
    const note = await prisma.behaviorNote.findUnique({
      where: { id: body.linkBehaviorNoteId },
      include: { student: true },
    });
    if (note && note.student.classroomId === classroomId && note.studentId === body.studentId) {
      linkNote = { id: note.id };
    }
  }

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.parentContactLog.create({
      data: {
        studentId: body.studentId,
        date: body.date ? new Date(body.date) : new Date(),
        reason: body.reason,
        method: body.method || "phone",
        comment: body.comment || null,
        followUp: !!body.followUp,
      },
    });
    if (linkNote) {
      await tx.behaviorNote.update({
        where: { id: linkNote.id },
        data: { contactLogId: created.id },
      });
    }
    return created;
  });

  return NextResponse.json(log, { status: 201 });
}

// PATCH { id, followUp }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.parentContactLog.findUnique({
    where: { id: body.id },
    include: { student: true },
  });
  if (!existing || existing.student.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const log = await prisma.parentContactLog.update({
    where: { id: body.id },
    data: { followUp: !!body.followUp },
  });

  return NextResponse.json(log);
}
