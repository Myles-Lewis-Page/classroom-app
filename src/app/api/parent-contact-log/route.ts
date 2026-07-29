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

// POST { studentId, date, reason, method, comment, followUp }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const log = await prisma.parentContactLog.create({
    data: {
      studentId: body.studentId,
      date: body.date ? new Date(body.date) : new Date(),
      reason: body.reason,
      method: body.method || "phone",
      comment: body.comment || null,
      followUp: !!body.followUp,
    },
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
