import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { date, type } - adds a test day to this list. type is "first" (the
// normal weekly test, every active student x every word) or "makeup" (the
// following week's retest - who's on it and which words is computed live
// from the "first" day's misses, see getMakeupRoster in src/lib/spelling.ts,
// not stored here).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const classroomId = await getCurrentClassroomId();
  const list = await prisma.spellingList.findUnique({ where: { id: listId } });
  if (!classroomId || !list || list.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const date = body.date ? new Date(body.date) : null;
  const type = body.type === "makeup" ? "makeup" : "first";

  if (!date || isNaN(date.getTime())) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  if (type === "makeup") {
    const hasFirst = await prisma.spellingTestDay.findFirst({ where: { listId, type: "first" } });
    if (!hasFirst) {
      return NextResponse.json(
        { error: "Add and mark a first test day before scheduling a makeup." },
        { status: 400 }
      );
    }
  }

  const testDay = await prisma.spellingTestDay.create({ data: { listId, date, type } });
  return NextResponse.json(testDay, { status: 201 });
}
