import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { reapplyAllTopics, shrinkUnitDaysIfPossible, captureUnitDayState, cascadeAfterChange } from "@/lib/pacing";

// DELETE - removes a topic, reapplies the remaining topics so they stay
// contiguous starting at Day 1 (no gap left where the removed one was), and
// - if this topic was the reason the unit ran long - trims the now-unused
// trailing days back down to whichever is longer: the unit's originally-set
// length, or however many days the remaining topics still need. Whatever
// comes after this unit then shifts back up to close the gap.
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
  const before = await captureUnitDayState(unitId);

  await prisma.unitTopic.delete({ where: { id: topicId } });
  await reapplyAllTopics(unitId);
  await shrinkUnitDaysIfPossible(unitId);
  await cascadeAfterChange(unitId, before);

  return NextResponse.json({ ok: true });
}
