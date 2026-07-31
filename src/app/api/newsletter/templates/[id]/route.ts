import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// DELETE - remove a saved template (doesn't touch any draft/published
// Newsletter that may have been created from it in the past - templates
// are just a starting-point layout, not a live link).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const template = await prisma.newsletterTemplate.findUnique({ where: { id } });
  if (!classroomId || !template || template.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.newsletterTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
