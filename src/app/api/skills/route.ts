import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET /api/skills?subjectId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ skills: [], statuses: [] });

  const subjectId = req.nextUrl.searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

  const subject = await prisma.skillSubject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const skills = await prisma.skill.findMany({
    where: { skillSubjectId: subjectId },
    orderBy: { order: "asc" },
  });
  const statuses = await prisma.studentSkillStatus.findMany({
    where: { skill: { skillSubjectId: subjectId }, student: { classroomId } },
  });

  return NextResponse.json({ skills, statuses });
}

// POST { subjectId, category?, skillName, order } - add a new skill to a subject
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const subject = await prisma.skillSubject.findUnique({ where: { id: body.subjectId } });
  if (!subject || subject.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const skill = await prisma.skill.create({
    data: {
      skillSubjectId: body.subjectId,
      category: body.category || null,
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

  const skill = await prisma.skill.findUnique({ include: { skillSubject: true }, where: { id: skillId } });
  if (!classroomId || !skill || skill.skillSubject.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.skill.delete({ where: { id: skillId } });
  return NextResponse.json({ ok: true });
}
