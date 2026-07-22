import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await prisma.student.findMany({
    where: { isActive: true },
    include: {
      tags: { include: { tag: true } },
      allergies: true,
      dietaryRestrictions: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const student = await prisma.student.create({
    data: {
      classroomId: body.classroomId,
      firstName: body.firstName,
      lastName: body.lastName,
      grade: body.grade,
      section: body.section ?? null,
      dob: body.dob ? new Date(body.dob) : null,
      understandingLevel: body.understandingLevel ?? null,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
