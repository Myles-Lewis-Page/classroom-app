import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleScope";

// DELETE - removes a School and any Principal(s) at it (schema cascade).
// Teachers under those Principals are never deleted - Teacher.schoolId
// and Teacher.principalId both use onDelete: SetNull, so a Teacher just
// becomes unassigned (their own account, classroom, and student data are
// completely untouched) rather than being removed. Safe to describe to
// the Admin as "detaches teachers, doesn't delete anything of theirs."
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.school.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
