import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { supportTypeId, label }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const body = await req.json();

  const type = await prisma.supportType.findUnique({ where: { id: body.supportTypeId } });
  if (!classroomId || !type || type.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const label = (body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const count = await prisma.supportOption.count({ where: { supportTypeId: body.supportTypeId } });

  const option = await prisma.supportOption.create({
    data: { supportTypeId: body.supportTypeId, label, order: count },
  });

  return NextResponse.json(option, { status: 201 });
}

// DELETE ?optionId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const optionId = req.nextUrl.searchParams.get("optionId");
  if (!optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });

  const option = await prisma.supportOption.findUnique({
    where: { id: optionId },
    include: { supportType: true },
  });
  if (!classroomId || !option || option.supportType.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.supportOption.delete({ where: { id: optionId } });
  return NextResponse.json({ ok: true });
}
