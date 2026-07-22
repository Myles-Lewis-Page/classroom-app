import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
  const email = (body.email ?? "").trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
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
