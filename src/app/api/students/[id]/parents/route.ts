import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { name, relationship, phone, email, preferredContact, isEmergencyContact, notes }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const parent = await prisma.parent.create({
    data: {
      studentId: id,
      name: body.name,
      relationship: body.relationship,
      phone: body.phone || null,
      email: body.email || null,
      preferredContact: body.preferredContact || null,
      isEmergencyContact: !!body.isEmergencyContact,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(parent, { status: 201 });
}

// DELETE ?parentId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parentId = req.nextUrl.searchParams.get("parentId");
  if (!parentId) return NextResponse.json({ error: "parentId required" }, { status: 400 });

  await prisma.parent.delete({ where: { id: parentId } });
  return NextResponse.json({ ok: true });
}
