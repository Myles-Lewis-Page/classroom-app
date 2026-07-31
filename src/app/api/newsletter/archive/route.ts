import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// GET - past published issues, most recent first, with their frozen
// rendered text (see publish route for why it's frozen rather than
// re-rendered live).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const issues = await prisma.newsletter.findMany({
    where: { classroomId, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, weekOf: true, publishedAt: true, renderedText: true },
  });

  return NextResponse.json(issues);
}
