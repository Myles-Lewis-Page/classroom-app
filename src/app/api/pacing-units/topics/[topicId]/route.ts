import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { reapplyAllTopics } from "@/lib/pacing";

// DELETE - removes a topic and reapplies the remaining topics so they stay
// contiguous starting at Day 1 (no gap left where the removed one was).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  const classroomId = await getCurrentClassroomId();
  const topic = await prisma.unitTopic.findUnique({ where: { id: topicId }, include: { unit: true } });
  if (!classroomId || !topic || topic.unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unitId = topic.unitId;
  await prisma.unitTopic.delete({ where: { id: topicId } });
  await reapplyAllTopics(unitId);

  return NextResponse.json({ ok: true });
}
