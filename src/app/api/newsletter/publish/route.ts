import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks } from "@/lib/newsletter";

// POST - freezes the current draft into a published archive entry (with a
// rendered-text snapshot, so the archive stays accurate even if e.g. an
// events block's underlying event is later edited or deleted), then opens
// a brand new empty draft for the next week. This is a deliberate,
// explicit action - Publish - rather than something that happens
// automatically when the Weekly Report is generated, since she may
// generate/regenerate the Weekly Report multiple times before a week's
// newsletter is actually "done."
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const draft = await getOrCreateDraft(classroomId);
  if (draft.blocks.length === 0) {
    return NextResponse.json({ error: "Add at least one block before publishing." }, { status: 400 });
  }

  const renderedText = await renderNewsletterBlocks(draft.blocks, classroomId);

  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const [published] = await prisma.$transaction([
    prisma.newsletter.update({
      where: { id: draft.id },
      data: { status: "published", weekOf: monday, publishedAt: now, renderedText },
    }),
    prisma.newsletter.create({ data: { classroomId, status: "draft" } }),
  ]);

  return NextResponse.json(published);
}
