import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleScope";
import { validatePasswordStrength } from "@/lib/passwordPolicy";

// POST { currentPassword, newPassword } - Admin can only change their own
// password here (no self-service email/name change - matches the minimal,
// root-of-trust surface Admin has everywhere else in this app).
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const currentPassword = body.currentPassword as string | undefined;
  const newPassword = body.newPassword as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are both required" }, { status: 400 });
  }
  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }
  const policyError = validatePasswordStrength(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
