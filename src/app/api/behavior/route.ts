import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateRating } from "@/lib/behaviorRating";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

// GET /api/behavior?date=2026-07-21
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);

  const entries = await prisma.behaviorEntry.findMany({
    where: { date, student: { classroomId } },
    include: { subject: true },
  });

  return NextResponse.json(entries);
}

// POST { studentId, subjectId, date, calmBody, listeningEars, kindWords, stayInArea, finishedWork, none, comment }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const date = new Date(body.date);
  date.setHours(0, 0, 0, 0);

  const flags = {
    calmBody: !!body.calmBody,
    listeningEars: !!body.listeningEars,
    kindWords: !!body.kindWords,
    stayInArea: !!body.stayInArea,
    finishedWork: !!body.finishedWork,
  };
  const rating = body.none ? null : calculateRating(flags);

  const entry = await prisma.behaviorEntry.upsert({
    where: {
      studentId_subjectId_date: {
        studentId: body.studentId,
        subjectId: body.subjectId,
        date,
      },
    },
    update: { ...flags, none: !!body.none, rating, comment: body.comment ?? null },
    create: {
      studentId: body.studentId,
      subjectId: body.subjectId,
      date,
      ...flags,
      none: !!body.none,
      rating,
      comment: body.comment ?? null,
    },
  });

  return NextResponse.json(entry);
}
