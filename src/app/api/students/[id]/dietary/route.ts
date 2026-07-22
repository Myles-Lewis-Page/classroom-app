import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { restriction, notes }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const restriction = await prisma.dietaryRestriction.create({
    data: {
      studentId: id,
      restriction: body.restriction,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(restriction, { status: 201 });
}

// DELETE ?restrictionId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restrictionId = req.nextUrl.searchParams.get("restrictionId");
  if (!restrictionId) return NextResponse.json({ error: "restrictionId required" }, { status: 400 });

  await prisma.dietaryRestriction.delete({ where: { id: restrictionId } });
  return NextResponse.json({ ok: true });
}
