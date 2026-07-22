import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({
      students: [],
      relationships: [],
      seatingRows: 5,
      seatingCols: 6,
      extraSeats: [],
    });
  }

  const [classroom, students, relationships, extraSeats] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { seatingRows: true, seatingCols: true },
    }),
    prisma.student.findMany({
      where: { isActive: true, classroomId },
      include: { seatingAssignment: true },
    }),
    prisma.relationship.findMany({
      where: { type: "conflict", student: { classroomId } },
    }),
    prisma.extraSeat.findMany({ where: { classroomId } }),
  ]);

  return NextResponse.json({
    students,
    relationships,
    seatingRows: classroom?.seatingRows ?? 5,
    seatingCols: classroom?.seatingCols ?? 6,
    extraSeats,
  });
}

// POST { studentId, posX, posY, swapWithStudentId? }
// Places (or moves) a student to a seat. If another student is already at
// that seat, pass their id as swapWithStudentId to exchange positions rather
// than silently overwriting them.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(body.studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.swapWithStudentId) {
    if (!(await studentBelongsToClassroom(body.swapWithStudentId, classroomId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [movingStudentSeat, otherSeat] = await Promise.all([
      prisma.seatingAssignment.findUnique({ where: { studentId: body.studentId } }),
      prisma.seatingAssignment.findUnique({ where: { studentId: body.swapWithStudentId } }),
    ]);

    await prisma.seatingAssignment.upsert({
      where: { studentId: body.swapWithStudentId },
      update: { posX: movingStudentSeat?.posX ?? 0, posY: movingStudentSeat?.posY ?? 0 },
      create: {
        studentId: body.swapWithStudentId,
        posX: movingStudentSeat?.posX ?? 0,
        posY: movingStudentSeat?.posY ?? 0,
      },
    });
    const assignment = await prisma.seatingAssignment.upsert({
      where: { studentId: body.studentId },
      update: { posX: body.posX, posY: body.posY },
      create: { studentId: body.studentId, posX: body.posX, posY: body.posY },
    });
    return NextResponse.json(assignment);
  }

  const assignment = await prisma.seatingAssignment.upsert({
    where: { studentId: body.studentId },
    update: { posX: body.posX, posY: body.posY },
    create: { studentId: body.studentId, posX: body.posX, posY: body.posY },
  });

  return NextResponse.json(assignment);
}

// DELETE ?studentId=xxx - unseat a student (remove their seating assignment)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(studentId, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.seatingAssignment.deleteMany({ where: { studentId } });
  return NextResponse.json({ ok: true });
}
