import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ skills: [], statuses: [] });

  const skills = await prisma.literacySkill.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  const statuses = await prisma.studentLiteracyStatus.findMany({
    where: { student: { classroomId } },
  });

  return NextResponse.json({ skills, statuses });
}

// POST { category, skillName, order } - classroomId derived from session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const skill = await prisma.literacySkill.create({
    data: {
      classroomId,
      category: body.category,
      skillName: body.skillName,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json(skill, { status: 201 });
}

// DELETE ?skillId=xxx - removes the skill and all student statuses for it (cascade)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const skillId = req.nextUrl.searchParams.get("skillId");
  if (!skillId) return NextResponse.json({ error: "skillId required" }, { status: 400 });

  const skill = await prisma.literacySkill.findUnique({ where: { id: skillId } });
  if (!classroomId || !skill || skill.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.literacySkill.delete({ where: { id: skillId } });
  return NextResponse.json({ ok: true });
}
