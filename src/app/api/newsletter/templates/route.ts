import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft } from "@/lib/newsletter";

// GET - every saved template for this classroom
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const templates = await prisma.newsletterTemplate.findMany({
    where: { classroomId },
    include: { blocks: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

// POST { name } - saves the current draft's block layout as a reusable
// template under that name (a snapshot/copy - editing the draft further
// afterward doesn't change the saved template).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const draft = await getOrCreateDraft(classroomId);
  if (draft.blocks.length === 0) {
    return NextResponse.json({ error: "The current draft is empty - add some blocks first." }, { status: 400 });
  }

  const template = await prisma.newsletterTemplate.create({
    data: {
      classroomId,
      name,
      blocks: {
        create: draft.blocks.map((b) => ({ type: b.type, content: b.content as object, order: b.order })),
      },
    },
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(template, { status: 201 });
}
