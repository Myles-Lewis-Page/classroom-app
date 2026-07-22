import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/attendance?date=2026-07-21
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);

  const entries = await prisma.attendanceEntry.findMany({
    where: { date },
  });

  return NextResponse.json(entries);
}

// POST { studentId, date, status } - upsert one student's attendance for a day
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = new Date(body.date);
  date.setHours(0, 0, 0, 0);

  const entry = await prisma.attendanceEntry.upsert({
    where: {
      studentId_date: { studentId: body.studentId, date },
    },
    update: { status: body.status },
    create: {
      studentId: body.studentId,
      date,
      status: body.status,
    },
  });

  return NextResponse.json(entry);
}
