import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleScope";

// DELETE - removes a Principal. Teachers under them are never deleted -
// Teacher.principalId uses onDelete: SetNull, so each Teacher just becomes
// unassigned (their account, classroom, and student data are completely
// untouched, and their name/email become self-editable again the same as
// a pre-Principal-system account) rather than being removed.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const principal = await prisma.principal.findUnique({ where: { id } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.principal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
