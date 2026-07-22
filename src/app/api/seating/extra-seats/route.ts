import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST { row } - adds one extra seat to the end of the given row (col is
// computed automatically as one past whatever's currently the widest point
// of that row, base grid or existing extra seats).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const row = Number(body.row);
  if (Number.isNaN(row) || row < 0) {
    return NextResponse.json({ error: "valid row is required" }, { status: 400 });
  }

  const [classroom, existingExtraInRow] = await Promise.all([
    prisma.classroom.findUnique({ where: { id: classroomId }, select: { seatingCols: true } }),
    prisma.extraSeat.findMany({ where: { classroomId, row } }),
  ]);

  const baseCols = classroom?.seatingCols ?? 6;
  const maxExtraCol = existingExtraInRow.reduce((max, s) => Math.max(max, s.col), baseCols - 1);
  const newCol = maxExtraCol + 1;

  const seat = await prisma.extraSeat.create({
    data: { classroomId, row, col: newCol },
  });

  return NextResponse.json(seat, { status: 201 });
}

// DELETE ?seatId=xxx - removes an extra seat (only if nothing is seated there)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const seatId = req.nextUrl.searchParams.get("seatId");
  if (!seatId) return NextResponse.json({ error: "seatId required" }, { status: 400 });

  const seat = await prisma.extraSeat.findUnique({ where: { id: seatId } });
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

  await prisma.extraSeat.delete({ where: { id: seatId } });
  return NextResponse.json({ ok: true });
}
