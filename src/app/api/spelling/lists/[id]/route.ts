import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

async function ownedList(id: string, classroomId: string) {
  const list = await prisma.spellingList.findUnique({ where: { id } });
  if (!list || list.classroomId !== classroomId) return null;
  return list;
}

// GET - one list with its words and test days
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedList(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const list = await prisma.spellingList.findUnique({
    where: { id },
    include: { words: { orderBy: { order: "asc" } }, testDays: { orderBy: { date: "asc" } } },
  });
  return NextResponse.json(list);
}

// PATCH { weekOf?, words? } - replaces the word list wholesale when words
// is provided (simplest correct behavior - editing a spelling list is rare
// enough that a full replace beats reconciling adds/removes/reorders).
// Existing SpellingResult rows for removed words cascade-delete with them,
// which only matters if she edits a list after already testing on it -
// worth a confirm on the client before calling this in that case.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedList(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: { weekOf?: Date } = {};
  if (body.weekOf) updates.weekOf = new Date(body.weekOf);

  if (body.words !== undefined) {
    const words = (Array.isArray(body.words) ? (body.words as string[]) : [])
      .map((w) => w.trim())
      .filter(Boolean);
    await prisma.$transaction([
      prisma.spellingWord.deleteMany({ where: { listId: id } }),
      prisma.spellingWord.createMany({ data: words.map((word, i) => ({ listId: id, word, order: i })) }),
    ]);
  }
  if (Object.keys(updates).length > 0) {
    await prisma.spellingList.update({ where: { id }, data: updates });
  }

  const updated = await prisma.spellingList.findUnique({
    where: { id },
    include: { words: { orderBy: { order: "asc" } }, testDays: true },
  });
  return NextResponse.json(updated);
}

// DELETE - removes the list, its words, test days, and results (cascade)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedList(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.spellingList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
