import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePrincipal, getPrincipalOwnedTeacher } from "@/lib/roleScope";

// PATCH { name?, email?, isActive? } - only the Principal can rename a
// Teacher, change their email, or restore a previously-removed Teacher's
// login access. The Teacher themselves can only change their password.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const principalId = await requirePrincipal();
    if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const teacher = await getPrincipalOwnedTeacher(principalId, id);
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data: { name?: string; email?: string; isActive?: boolean } = {};
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
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    const updated = await prisma.teacher.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update teacher:", err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: `Server error updating teacher: ${message}` }, { status: 500 });
  }
}

// DELETE - soft-deletes a Teacher by setting isActive to false. This blocks
// their login (see auth.ts) but deliberately does NOT delete the row itself
// or anything under it (Classroom -> students, grades, behavior notes,
// IEP/504 data, attendance all cascade-delete from Teacher, so a real
// delete here would be destructive and irreversible). Reversed any time via
// PATCH { isActive: true }.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const principalId = await requirePrincipal();
    if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const teacher = await getPrincipalOwnedTeacher(principalId, id);
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.teacher.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to deactivate teacher:", err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: `Server error removing teacher: ${message}` }, { status: 500 });
  }
}
