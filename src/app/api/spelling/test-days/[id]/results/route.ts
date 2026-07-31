import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { results: { studentId, wordId, correct }[] } - bulk upsert. Sent
// as one batch from the marking grid (save button) rather than one call
// per cell, since a class-sized grid is dozens of cells.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: testDayId } = await params;
  const classroomId = await getCurrentClassroomId();
  const testDay = await prisma.spellingTestDay.findUnique({
    where: { id: testDayId },
    include: { list: true },
  });
  if (!classroomId || !testDay || testDay.list.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const results = Array.isArray(body.results) ? body.results : [];

  // Defense in depth: only ever write results for students who actually
  // belong to this classroom, even though the client should only ever
  // send its own roster's ids.
  const validStudentIds = new Set(
    (await prisma.student.findMany({ where: { classroomId }, select: { id: true } })).map((s) => s.id)
  );
  const validWordIds = new Set(
    (await prisma.spellingWord.findMany({ where: { listId: testDay.listId }, select: { id: true } })).map((w) => w.id)
  );

  const safeResults = results.filter(
    (r: { studentId?: string; wordId?: string; correct?: boolean }) =>
      r.studentId && r.wordId && typeof r.correct === "boolean" && validStudentIds.has(r.studentId) && validWordIds.has(r.wordId)
  );

  await prisma.$transaction(
    safeResults.map((r: { studentId: string; wordId: string; correct: boolean }) =>
      prisma.spellingResult.upsert({
        where: { testDayId_wordId_studentId: { testDayId, wordId: r.wordId, studentId: r.studentId } },
        create: { testDayId, wordId: r.wordId, studentId: r.studentId, correct: r.correct },
        update: { correct: r.correct },
      })
    )
  );

  return NextResponse.json({ ok: true, saved: safeResults.length });
}
