import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const subjects = await prisma.subject.findMany({
    where: { classroomId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(subjects);
}

// POST { name, icon, order } - classroomId derived from session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const subject = await prisma.subject.create({
    data: {
      classroomId,
      name: body.name,
      icon: body.icon ?? null,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json(subject, { status: 201 });
}
