import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "@/lib/passwordPolicy";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// POST { token, newPassword }
export async function POST(req: NextRequest) {
  // Reset tokens are high-entropy (32 random bytes) so brute-forcing one
  // directly isn't realistic, but rate limiting this route still costs
  // nothing and closes off any future weakening of that assumption.
  const ip = getClientIp(req);
  const limit = checkRateLimit(`reset-password:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const token = (body.token ?? "").trim();
  const newPassword = (body.newPassword ?? "").trim();

  if (!token || !newPassword) {
    return NextResponse.json({ error: "token and newPassword are required" }, { status: 400 });
  }
  const policyError = validatePasswordStrength(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.teacher.update({
      where: { id: resetToken.teacherId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
