import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getMakeupRoster } from "@/lib/spelling";

// GET - the marking roster for this test day:
//   "first"  -> every active student x every word on the list
//   "makeup" -> only students who missed something on the first test day,
//               each with only their own missed words (see getMakeupRoster)
// Any results already saved for this specific test day are included so
// re-opening a partially-marked day shows what's already been entered.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();

  const testDay = await prisma.spellingTestDay.findUnique({
    where: { id },
    include: { list: { include: { words: { orderBy: { order: "asc" } } } }, results: true },
  });
  if (!classroomId || !testDay || testDay.list.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingByKey = new Map(testDay.results.map((r) => [`${r.studentId}:${r.wordId}`, r.correct]));

  if (testDay.type === "first") {
    const students = await prisma.student.findMany({
      where: { classroomId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const roster = students.map((s) => ({
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      words: testDay.list.words.map((w) => ({
        wordId: w.id,
        word: w.word,
        correct: existingByKey.get(`${s.id}:${w.id}`) ?? null,
      })),
    }));
    return NextResponse.json({ testDay, roster });
  }

  // Makeup: personalized per-student word subsets
  const makeup = await getMakeupRoster(testDay.listId);
  const roster = makeup.map((entry) => ({
    studentId: entry.student.id,
    studentName: `${entry.student.firstName} ${entry.student.lastName}`,
    words: entry.words.map((w) => ({
      wordId: w.id,
      word: w.word,
      correct: existingByKey.get(`${entry.student.id}:${w.id}`) ?? null,
    })),
  }));
  return NextResponse.json({ testDay, roster });
}
