import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// GET /api/behavior-notes?studentId=xxx&needsCall=1
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const studentId = req.nextUrl.searchParams.get("studentId");
  const needsCall = req.nextUrl.searchParams.get("needsCall");

  const notes = await prisma.behaviorNote.findMany({
    where: {
      student: { classroomId },
      ...(studentId ? { studentId } : {}),
      ...(needsCall ? { contactLogId: null } : {}),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
      contactLog: true,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(notes);
}

// POST { studentId, date, type, tag, note?, subjectId? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const type = body.type === "bad" ? "bad" : "good";
  const tag = (body.tag ?? "").trim();
  if (!tag) return NextResponse.json({ error: "tag is required" }, { status: 400 });

  const note = await prisma.behaviorNote.create({
    data: {
      studentId: body.studentId,
      date: body.date ? new Date(body.date) : new Date(),
      type,
      tag,
      note: body.note || null,
      subjectId: body.subjectId || null,
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
      contactLog: true,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
