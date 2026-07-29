import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { applyTopicToDays } from "@/lib/pacing";

// POST { name, days, learningTarget?, standards?, support? }
// Creates a topic block and auto-fills the next `days` consecutive day-rows
// with it, starting right after whatever the previous topic left off (Day 1
// if this is the first one).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const unit = await prisma.pacingUnit.findUnique({ where: { id } });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const days = Number(body.days);
  if (!name || !Number.isFinite(days) || days < 1) {
    return NextResponse.json({ error: "name and a positive days count are required" }, { status: 400 });
  }

  const count = await prisma.unitTopic.count({ where: { unitId: id } });
  const topic = await prisma.unitTopic.create({
    data: {
      unitId: id,
      name,
      days,
      learningTarget: body.learningTarget || null,
      standards: body.standards || null,
      support: body.support || null,
      order: count,
    },
  });

  await applyTopicToDays(id, topic.id);

  const withDays = await prisma.pacingUnit.findUnique({
    where: { id },
    include: {
      days: { orderBy: { dayNumber: "asc" } },
      unitTopics: { orderBy: { order: "asc" } },
      unitSummatives: { orderBy: { date: "asc" } },
    },
  });

  return NextResponse.json(withDays, { status: 201 });
}
