import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ newsletterContent: "" });

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { newsletterContent: true },
  });
  return NextResponse.json({ newsletterContent: classroom?.newsletterContent ?? "" });
}

// PATCH { newsletterContent }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const body = await req.json();
  await prisma.classroom.update({
    where: { id: classroomId },
    data: { newsletterContent: body.newsletterContent ?? "" },
  });

  return NextResponse.json({ ok: true });
}
