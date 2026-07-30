import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

async function ownedExtraDay(id: string, classroomId: string) {
  const extra = await prisma.periodExtraDay.findUnique({
    where: { id },
    include: { pacingUnit: true },
  });
  if (!extra || extra.pacingUnit.classroomId !== classroomId) return null;
  return extra;
}

// PATCH { topic?, learningTarget?, standards?, supports?, lessonActivities?,
//         warmUp?, materialsNeeded?, status? } - same field set as a
// regular PacingUnitDay, since this is meant to be planned on exactly the
// same way.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedExtraDay(id, classroomId))) {
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
  if (body.status !== undefined && ["not_started", "completed", "half_completed"].includes(body.status)) {
    data.status = body.status;
  }

  const updated = await prisma.periodExtraDay.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE - manually remove this Period's extra day (e.g. it turned out not
// to be needed after all). Always allowed regardless of status, unlike the
// automatic removal in setDayStatusForSection which only ever touches an
// untouched one - this is an explicit teacher action.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedExtraDay(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.periodExtraDay.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
