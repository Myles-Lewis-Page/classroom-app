import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET - every spelling list for this classroom, most recent week first,
// with word count and test day count so the management page can show a
// useful summary without a second round trip per list.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const lists = await prisma.spellingList.findMany({
    where: { classroomId },
    orderBy: { weekOf: "desc" },
    include: {
      words: { orderBy: { order: "asc" } },
      testDays: { orderBy: { date: "asc" } },
    },
  });
  return NextResponse.json(lists);
}

// POST { weekOf, words: string[] } - creates a new weekly word list. Words
// are whatever she uploads/types, trimmed and emptied entries dropped;
// order is preserved so exports and the newsletter show them the way she
// entered them.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const body = await req.json();
  const weekOf = body.weekOf ? new Date(body.weekOf) : null;
  const words = (Array.isArray(body.words) ? (body.words as string[]) : [])
    .map((w) => w.trim())
    .filter(Boolean);

  if (!weekOf || isNaN(weekOf.getTime())) {
    return NextResponse.json({ error: "weekOf is required" }, { status: 400 });
  }
  if (words.length === 0) {
    return NextResponse.json({ error: "At least one word is required" }, { status: 400 });
  }

  const list = await prisma.spellingList.create({
    data: {
      classroomId,
      weekOf,
      words: { create: words.map((word, i) => ({ word, order: i })) },
    },
    include: { words: { orderBy: { order: "asc" } }, testDays: true },
  });

  return NextResponse.json(list, { status: 201 });
}
