import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/roleScope";
import { generateTempPassword } from "@/lib/tempPassword";

// GET - every Teacher at this Principal's School.
export async function GET() {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teachers = await prisma.teacher.findMany({
    where: { schoolId: principal.schoolId },
    select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(teachers);
}

// POST { name, email } - creates a Teacher at this Principal's School with a
// generated temporary password, returned once for the Principal to relay.
export async function POST(req: NextRequest) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const existing = await prisma.teacher.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A teacher with that email already exists" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const teacher = await prisma.teacher.create({
    data: {
      name,
      email,
      passwordHash,
      schoolId: principal.schoolId,
      principalId: principal.id,
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true },
  });

  return NextResponse.json({ teacher, tempPassword }, { status: 201 });
}
