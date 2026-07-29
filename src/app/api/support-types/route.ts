import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const types = await prisma.supportType.findMany({
    where: { classroomId },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(types);
}

// POST { name }
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

  const count = await prisma.supportType.count({ where: { classroomId } });

  const type = await prisma.supportType.upsert({
    where: { classroomId_name: { classroomId, name } },
    update: {},
    create: { classroomId, name, order: count },
  });

  return NextResponse.json(type, { status: 201 });
}

// DELETE ?typeId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const typeId = req.nextUrl.searchParams.get("typeId");
  if (!typeId) return NextResponse.json({ error: "typeId required" }, { status: 400 });

  const type = await prisma.supportType.findUnique({ where: { id: typeId } });
  if (!classroomId || !type || type.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.supportType.delete({ where: { id: typeId } });
  return NextResponse.json({ ok: true });
}
