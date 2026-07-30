import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePrincipal, getPrincipalOwnedTeacher } from "@/lib/roleScope";

// PATCH { name?, email? } - only the Principal can rename a Teacher or
// change their email; the Teacher themselves can only change their password.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const teacher = await getPrincipalOwnedTeacher(principalId, id);
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: { name?: string; email?: string } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "name can't be blank" }, { status: 400 });
    data.name = name;
  }
  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email can't be blank" }, { status: 400 });
    const clash = await prisma.teacher.findUnique({ where: { email } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Another teacher already uses that email" }, { status: 409 });
    }
    data.email = email;
  }

  const updated = await prisma.teacher.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true },
  });
  return NextResponse.json(updated);
}
