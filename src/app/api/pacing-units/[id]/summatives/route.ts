import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";

// POST { title, date } - adds one summative assessment to the unit.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const unit = await prisma.pacingUnit.findUnique({ where: { id } });
  if (!classroomId || !unit || unit.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title || !body.date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  const count = await prisma.unitSummative.count({ where: { unitId: id } });
  const summative = await prisma.unitSummative.create({
    data: { unitId: id, title, date: parseDateOnly(body.date), order: count },
  });

  return NextResponse.json(summative, { status: 201 });
}
