import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft } from "@/lib/newsletter";

// POST - replaces the current draft's blocks with a fresh copy of this
// template's blocks. Destructive to whatever's currently in the draft -
// the page confirms with her before calling this, since there's no undo.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const template = await prisma.newsletterTemplate.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!template || template.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await getOrCreateDraft(classroomId);

  await prisma.$transaction([
    prisma.newsletterBlock.deleteMany({ where: { newsletterId: draft.id } }),
    prisma.newsletterBlock.createMany({
      data: template.blocks.map((b) => ({
        newsletterId: draft.id,
        type: b.type,
        content: b.content as object,
        order: b.order,
        column: b.column,
        span: b.span,
        row: b.row,
        height: b.height,
      })),
    }),
  ]);

  const updated = await prisma.newsletter.findUnique({
    where: { id: draft.id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(updated);
}
