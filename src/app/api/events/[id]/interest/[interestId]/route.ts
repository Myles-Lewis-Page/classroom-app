import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interestId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interestId } = await params;
  const classroomId = await getCurrentClassroomId();
  const interest = await prisma.chaperoneInterest.findUnique({
    where: { id: interestId },
    include: { event: true },
  });
  if (!classroomId || !interest || interest.event.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chaperoneInterest.delete({ where: { id: interestId } });
  return NextResponse.json({ ok: true });
}
