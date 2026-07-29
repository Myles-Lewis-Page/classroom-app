import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// DELETE - removes one summative
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ summativeId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summativeId } = await params;
  const classroomId = await getCurrentClassroomId();
  const summative = await prisma.unitSummative.findUnique({
    where: { id: summativeId },
    include: { unit: true },
  });
  if (!classroomId || !summative || summative.unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.unitSummative.delete({ where: { id: summativeId } });
  return NextResponse.json({ ok: true });
}
