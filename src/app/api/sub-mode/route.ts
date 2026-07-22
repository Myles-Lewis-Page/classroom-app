import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ students: [], subjects: [] });

  const [students, subjects] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true, classroomId },
      include: {
        allergies: true,
        dietaryRestrictions: true,
        ieps: true,
        seatingAssignment: true,
        observations: { orderBy: { date: "desc" }, take: 2 },
      },
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.subject.findMany({ where: { classroomId }, orderBy: { order: "asc" } }),
  ]);

  return NextResponse.json({ students, subjects });
}
