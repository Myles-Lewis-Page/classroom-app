import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  const classroom = await prisma.classroom.findFirst({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(classroom);
}
