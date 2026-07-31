import { prisma } from "@/lib/prisma";

/**
 * For a "makeup" test day: which students need one, and which specific
 * words each of them personally missed. This is computed fresh from the
 * list's "first" test day results every time, rather than stored - so if
 * she corrects a mis-entered result on the first test day, the makeup
 * roster automatically reflects that instead of going stale.
 */
export async function getMakeupRoster(listId: string) {
  const firstDay = await prisma.spellingTestDay.findFirst({
    where: { listId, type: "first" },
    include: {
      results: { include: { word: true, student: true } },
    },
  });
  if (!firstDay) return [];

  const missedByStudent = new Map<string, { student: (typeof firstDay.results)[number]["student"]; words: (typeof firstDay.results)[number]["word"][] }>();
  for (const r of firstDay.results) {
    if (r.correct) continue;
    if (!missedByStudent.has(r.studentId)) {
      missedByStudent.set(r.studentId, { student: r.student, words: [] });
    }
    missedByStudent.get(r.studentId)!.words.push(r.word);
  }

  return Array.from(missedByStudent.values())
    .filter((entry) => entry.student.isActive)
    .sort((a, b) => a.student.lastName.localeCompare(b.student.lastName));
}

/**
 * Every word ever tested in this classroom, aggregated across every list/
 * test day it's appeared in (matched by trimmed, lowercased text - so
 * reusing "friend" in week 3 and week 10 counts as the same word for this
 * analysis, which is the whole point: finding words worth reusing).
 * Optionally scoped to one Section for the "period mode" breakdown.
 */
export async function getWordBank(classroomId: string, sectionId?: string) {
  const results = await prisma.spellingResult.findMany({
    where: {
      word: { list: { classroomId } },
      ...(sectionId ? { student: { sectionId } } : {}),
    },
    include: { word: true },
  });

  const byWord = new Map<string, { word: string; correct: number; total: number }>();
  for (const r of results) {
    const key = r.word.word.trim().toLowerCase();
    if (!byWord.has(key)) byWord.set(key, { word: r.word.word.trim(), correct: 0, total: 0 });
    const entry = byWord.get(key)!;
    entry.total += 1;
    if (r.correct) entry.correct += 1;
  }

  return Array.from(byWord.values())
    .map((e) => ({ ...e, percentCorrect: e.total === 0 ? null : Math.round((e.correct / e.total) * 100) }))
    .sort((a, b) => (a.percentCorrect ?? 100) - (b.percentCorrect ?? 100)); // worst-known words first
}

/**
 * One student's spelling history: every word they've ever been tested on,
 * with their most recent result (a word retested on a makeup day shows
 * its makeup outcome, not the original miss) - this is "known vs not
 * known" as of right now, which is what the Student Profile page and a
 * parent actually want to see, not a raw attempt log.
 */
export async function getStudentSpellingSummary(studentId: string) {
  const results = await prisma.spellingResult.findMany({
    where: { studentId },
    include: { word: true, testDay: true },
    orderBy: { testDay: { date: "asc" } },
  });

  const latestByWord = new Map<string, { word: string; correct: boolean; date: Date }>();
  for (const r of results) {
    const key = r.word.word.trim().toLowerCase();
    latestByWord.set(key, { word: r.word.word.trim(), correct: r.correct, date: r.testDay.date });
  }

  const words = Array.from(latestByWord.values()).sort((a, b) => a.word.localeCompare(b.word));
  return {
    known: words.filter((w) => w.correct),
    notYet: words.filter((w) => !w.correct),
  };
}

/**
 * The spelling list for a given target date's week (matches if targetDate
 * falls within [weekOf, weekOf+6]) - used when the newsletter has an
 * explicit "week ending" date set, so "next week's words" means the
 * newsletter's actual week, not just whatever's chronologically next.
 * With no targetDate, falls back to the nearest upcoming list (the
 * original behavior, still used when a newsletter hasn't set a week yet).
 */
export async function getUpcomingSpellingList(classroomId: string, targetDate?: Date) {
  if (targetDate) {
    const list = await prisma.spellingList.findFirst({
      where: { classroomId, weekOf: { lte: targetDate } },
      orderBy: { weekOf: "desc" },
      include: { words: { orderBy: { order: "asc" } } },
    });
    if (!list) return null;
    const weekEnd = new Date(list.weekOf);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return targetDate <= weekEnd ? list : null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.spellingList.findFirst({
    where: { classroomId, weekOf: { gte: today } },
    orderBy: { weekOf: "asc" },
    include: { words: { orderBy: { order: "asc" } } },
  });
}
