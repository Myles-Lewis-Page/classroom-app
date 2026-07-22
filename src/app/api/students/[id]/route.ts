import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      allergies: true,
      dietaryRestrictions: true,
      ieps: true,
      parents: true,
      relationshipsFrom: { include: { relatedStudent: true } },
      relationshipsTo: { include: { student: true } },
      observations: { orderBy: { date: "desc" }, take: 20 },
      praiseNotes: { orderBy: { date: "desc" }, take: 20 },
      attendanceEntries: { orderBy: { date: "desc" }, take: 30 },
      homeworkEntries: {
        orderBy: { assignment: { date: "desc" } },
        take: 30,
        include: { assignment: true },
      },
      behaviorEntries: { orderBy: { date: "desc" }, take: 30, include: { subject: true } },
      mathStatuses: {
        where: { status: "mastered" },
        include: { mathSkill: true },
      },
      literacyStatuses: {
        where: { status: "mastered" },
        include: { literacySkill: true },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(student);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const student = await prisma.student.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(student);
}
