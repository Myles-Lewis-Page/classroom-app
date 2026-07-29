import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const categories = await prisma.gradeCategory.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}

// POST { name, weight } - adds a new category, or updates the weight if one
// with that name already exists.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const weight = Math.max(0, Math.min(100, Number(body.weight) || 0));

  const count = await prisma.gradeCategory.count({ where: { classroomId } });

  const category = await prisma.gradeCategory.upsert({
    where: { classroomId_name: { classroomId, name } },
    update: { weight },
    create: { classroomId, name, weight, order: count },
  });

  return NextResponse.json(category, { status: 201 });
}

// DELETE ?categoryId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });

  const category = await prisma.gradeCategory.findUnique({ where: { id: categoryId } });
  if (!classroomId || !category || category.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.gradeCategory.delete({ where: { id: categoryId } });
  return NextResponse.json({ ok: true });
}
