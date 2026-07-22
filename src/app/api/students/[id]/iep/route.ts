import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST { type, accommodations, serviceMinutes, goals, caseManager, reviewDate, subSafeSummary }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const iep = await prisma.iEP.create({
    data: {
      studentId: id,
      type: body.type,
      accommodations: body.accommodations,
      serviceMinutes: body.serviceMinutes || null,
      goals: body.goals || null,
      caseManager: body.caseManager || null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      subSafeSummary: body.subSafeSummary || null,
    },
  });

  return NextResponse.json(iep, { status: 201 });
}

// DELETE ?iepId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const iepId = req.nextUrl.searchParams.get("iepId");
  if (!iepId) return NextResponse.json({ error: "iepId required" }, { status: 400 });

  await prisma.iEP.delete({ where: { id: iepId } });
  return NextResponse.json({ ok: true });
}
