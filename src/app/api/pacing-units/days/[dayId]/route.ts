import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// PATCH { topic?, learningTarget?, standards?, supports?, lessonActivities?, warmUp?, materialsNeeded? }
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

  const updated = await prisma.pacingUnitDay.update({ where: { id: dayId }, data });
  return NextResponse.json(updated);
}
