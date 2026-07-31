import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

async function ownedChaperone(chaperoneId: string, classroomId: string) {
  const c = await prisma.eventChaperone.findUnique({
    where: { id: chaperoneId },
    include: { event: true },
  });
  if (!c || c.event.classroomId !== classroomId) return null;
  return c;
}

// PATCH { confirmed?, parentName?, relationship? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chaperoneId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chaperoneId } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedChaperone(chaperoneId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.confirmed !== undefined) data.confirmed = !!body.confirmed;
  if (body.parentName !== undefined) data.parentName = body.parentName;
  if (body.relationship !== undefined) data.relationship = body.relationship;

  const updated = await prisma.eventChaperone.update({ where: { id: chaperoneId }, data });
  return NextResponse.json(updated);
}

// DELETE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chaperoneId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chaperoneId } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedChaperone(chaperoneId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.eventChaperone.delete({ where: { id: chaperoneId } });
  return NextResponse.json({ ok: true });
}
