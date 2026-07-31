import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// POST { email }
// Always returns a generic success message regardless of whether the email
// exists, to avoid leaking which accounts are real. If it does exist, a
// reset token is created and the reset link is logged server-side (visible
// in Railway's deploy/runtime logs) since no outbound email service is wired
// up yet - the account owner, who has dashboard access, can retrieve it
// themselves without needing a code change each time. Swap this for an
// actual email send later by plugging in an email provider here.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Rate limit by IP (stop mass-requesting resets for many emails) and by
  // email (stop spamming one teacher's inbox/logs with reset links).
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  const emailLimit = checkRateLimit(`forgot-password:email:${email}`, { max: 3, windowMs: 15 * 60_000 });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    // Same generic response as the success path - don't reveal that a
    // limit was hit specifically, which could itself leak whether an
    // account exists (e.g. only real accounts ever hit the email limit).
    return NextResponse.json({
      message:
        "If an account exists with that email, a reset link has been generated. Check the server logs for the link (or contact support).",
    });
  }

  const teacher = await prisma.teacher.findUnique({ where: { email } });

  if (teacher) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { teacherId: teacher.id, token, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Logged, not emailed - see comment above.
    console.log(`Password reset requested for ${email}. Reset link: ${resetLink}`);
  }

  return NextResponse.json({
    message:
      "If an account exists with that email, a reset link has been generated. Check the server logs for the link (or contact support).",
  });
}
