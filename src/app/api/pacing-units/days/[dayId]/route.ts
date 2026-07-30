import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { setDayStatus, setDayStatusForSection, removeExtraDay } from "@/lib/pacing";

// PATCH { topic?, learningTarget?, standards?, supports?, lessonActivities?,
//         warmUp?, materialsNeeded?, status? }
// `status` ("not_started" | "completed" | "half_completed") goes through
// setDayStatus, which auto-inserts a continuation day when a lesson is
// marked half_completed - everything else is a plain field update.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const classroomId = await getCurrentClassroomId();

  const day = await prisma.pacingUnitDay.findUnique({
    where: { id: dayId },
    include: { pacingUnit: true },
  });
  if (!classroomId || !day || day.pacingUnit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const fields = [
    "topic",
    "learningTarget",
    "standards",
    "supports",
    "lessonActivities",
    "warmUp",
    "materialsNeeded",
  ] as const;
  const data: Record<string, string | null> = {};
  fields.forEach((f) => {
    if (body[f] !== undefined) data[f] = body[f] || null;
  });

  if (Object.keys(data).length > 0) {
    await prisma.pacingUnitDay.update({ where: { id: dayId }, data });
  }

  if (body.status !== undefined && ["not_started", "completed", "half_completed"].includes(body.status)) {
    // If a sectionId is given, this only tracks that ONE Period's progress
    // through the shared day - doesn't touch the shared row, insert a day,
    // or cascade later units. Validate the section actually belongs to this
    // classroom first so a stray id can't write into someone else's data.
    if (body.sectionId) {
      const section = await prisma.section.findUnique({ where: { id: body.sectionId } });
      if (!section || section.classroomId !== classroomId) {
        return NextResponse.json({ error: "Invalid sectionId" }, { status: 400 });
      }
      await setDayStatusForSection(dayId, body.sectionId, body.status);
      const updated = await prisma.pacingUnitDay.findUnique({
        where: { id: dayId },
        include: { periodStatuses: true },
      });
      return NextResponse.json(updated);
    }
    const updated = await setDayStatus(dayId, body.status);
    return NextResponse.json(updated);
  }

  const updated = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
  return NextResponse.json(updated);
}

// DELETE - removes an auto-inserted extra day (only allowed for days
// created by a half-completed insertion) and closes the gap.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const classroomId = await getCurrentClassroomId();
  const day = await prisma.pacingUnitDay.findUnique({
    where: { id: dayId },
    include: { pacingUnit: true },
  });
  if (!classroomId || !day || day.pacingUnit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!day.isExtraDay) {
    return NextResponse.json(
      { error: "Only an auto-inserted extra day can be removed here" },
      { status: 400 }
    );
  }

  const removed = await removeExtraDay(dayId);
  return NextResponse.json({ ok: removed });
}
