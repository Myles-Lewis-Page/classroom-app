import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleScope";

// GET - list every School (name only - never any Teacher/classroom data).
export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schools = await prisma.school.findMany({
    include: { _count: { select: { principals: true, teachers: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(schools);
}

// POST { name } - creates a new School.
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const existing = await prisma.school.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "A school with that name already exists" }, { status: 409 });

  const school = await prisma.school.create({ data: { name } });
  return NextResponse.json(school, { status: 201 });
}
