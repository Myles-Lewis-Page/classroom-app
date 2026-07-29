import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const sections = await prisma.section.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(sections);
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

  const count = await prisma.section.count({ where: { classroomId } });
  const section = await prisma.section.upsert({
    where: { classroomId_name: { classroomId, name } },
    update: {},
    create: { classroomId, name, order: count },
  });

  return NextResponse.json(section, { status: 201 });
}

// DELETE ?sectionId=xxx - removes a section; students in it just become unassigned (sectionId set to null)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!sectionId) return NextResponse.json({ error: "sectionId required" }, { status: 400 });

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!classroomId || !section || section.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.section.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}
