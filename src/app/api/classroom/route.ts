import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json(null);

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  return NextResponse.json(classroom);
}

// PATCH { firstDayOfSchool?, lastDayOfSchool? } - sets the school year's
// overall bounds for the School Calendar.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const data: { firstDayOfSchool?: Date | null; lastDayOfSchool?: Date | null } = {};
  if (body.firstDayOfSchool !== undefined) {
    data.firstDayOfSchool = body.firstDayOfSchool ? parseDateOnly(body.firstDayOfSchool) : null;
  }
  if (body.lastDayOfSchool !== undefined) {
    data.lastDayOfSchool = body.lastDayOfSchool ? parseDateOnly(body.lastDayOfSchool) : null;
  }

  const classroom = await prisma.classroom.update({ where: { id: classroomId }, data });
  return NextResponse.json(classroom);
}
