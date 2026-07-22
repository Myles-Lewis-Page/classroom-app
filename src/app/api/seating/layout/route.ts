import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ seats: [], canvasRows: 8, canvasCols: 10 });
  }

  const [classroom, seats] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { seatingRows: true, seatingCols: true },
    }),
    prisma.seatSlot.findMany({ where: { classroomId } }),
  ]);

  return NextResponse.json({
    seats,
    canvasRows: classroom?.seatingRows ?? 8,
    canvasCols: classroom?.seatingCols ?? 10,
  });
}

// POST { row, col } - add a single seat (manual editing)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const row = Number(body.row);
  const col = Number(body.col);
  if (Number.isNaN(row) || Number.isNaN(col) || row < 0 || col < 0) {
    return NextResponse.json({ error: "valid row and col are required" }, { status: 400 });
  }

  const seat = await prisma.seatSlot.upsert({
    where: { classroomId_row_col: { classroomId, row, col } },
    update: {},
    create: { classroomId, row, col },
  });

  return NextResponse.json(seat, { status: 201 });
}

// DELETE ?seatId=xxx - remove a single seat (only if unoccupied)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const seatId = req.nextUrl.searchParams.get("seatId");
  if (!seatId) return NextResponse.json({ error: "seatId required" }, { status: 400 });

  const seat = await prisma.seatSlot.findUnique({ where: { id: seatId } });
  if (!classroomId || !seat || seat.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const occupied = await prisma.seatingAssignment.findFirst({
    where: { posX: seat.col, posY: seat.row, student: { classroomId } },
  });
  if (occupied) {
    return NextResponse.json(
      { error: "Move the student out of this seat before removing it" },
      { status: 409 }
    );
  }

  await prisma.seatSlot.delete({ where: { id: seatId } });
  return NextResponse.json({ ok: true });
}
