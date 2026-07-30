import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { currentPassword, newEmail?, newPassword? }
// A Teacher can always change their own password. Email can only be
// self-changed if this Teacher predates the Principal system (no
// principalId set) - once a Principal manages them, only the Principal can
// change their name/email; this route silently ignores newEmail in that
// case rather than erroring, since the client already hides that field.
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "teacher") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  const teacher = teacherId ? await prisma.teacher.findUnique({ where: { id: teacherId } }) : null;
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const currentPassword = body.currentPassword as string | undefined;
  const newEmail = (body.newEmail ?? "").trim().toLowerCase();
  const newPassword = body.newPassword as string | undefined;

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  }
  const valid = await bcrypt.compare(currentPassword, teacher.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const data: { email?: string; passwordHash?: string; mustChangePassword?: boolean } = {};

  if (newEmail && newEmail !== teacher.email) {
    if (teacher.principalId) {
      return NextResponse.json(
        { error: "Your principal manages your email - contact them to change it." },
        { status: 403 }
      );
    }
    const clash = await prisma.teacher.findUnique({ where: { email: newEmail } });
    if (clash && clash.id !== teacher.id) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    data.email = newEmail;
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
    data.mustChangePassword = false;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.teacher.update({ where: { id: teacher.id }, data });
  return NextResponse.json({ email: updated.email });
}
