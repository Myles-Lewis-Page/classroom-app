import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleScope";
import { generateTempPassword } from "@/lib/tempPassword";

// GET - list every Principal (name/email/school - never any Teacher/classroom data).
export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principals = await prisma.principal.findMany({
    include: { school: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(principals);
}

// POST { name, email, schoolId } - creates a Principal with a generated
// temporary password, returned once in the response for the Admin to relay.
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const schoolId = (body.schoolId ?? "").trim();
  if (!name || !email || !schoolId) {
    return NextResponse.json({ error: "name, email, and schoolId are required" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const existing = await prisma.principal.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A principal with that email already exists" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const principal = await prisma.principal.create({
    data: { name, email, passwordHash, schoolId },
    include: { school: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ principal, tempPassword }, { status: 201 });
}
