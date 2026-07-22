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

// POST { studentId, date, reason, method, comment }
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
    },
  });

  return NextResponse.json(log, { status: 201 });
}
