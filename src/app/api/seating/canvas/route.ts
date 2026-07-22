import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { rows, cols } - resizes the editable canvas bounds for the Layout
// editor. This does NOT add or remove seats itself, just how much grid area
// is available to place them in.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const rows = Math.max(1, Math.min(30, Number(body.rows) || 8));
  const cols = Math.max(1, Math.min(30, Number(body.cols) || 10));

  const classroom = await prisma.classroom.update({
    where: { id: classroomId },
    data: { seatingRows: rows, seatingCols: cols },
    select: { seatingRows: true, seatingCols: true },
  });

  return NextResponse.json(classroom);
}
