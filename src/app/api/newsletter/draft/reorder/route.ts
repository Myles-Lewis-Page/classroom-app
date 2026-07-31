import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft } from "@/lib/newsletter";

// POST { orderedIds: string[] } - the full list of the draft's block ids,
// in their new order. Sent as one bulk call from drag-and-drop (rather
// than a PATCH per block) so a reorder is one atomic write instead of N
// separate round trips racing each other.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const body = await req.json();
  const orderedIds = Array.isArray(body.orderedIds) ? (body.orderedIds as string[]) : [];

  const draft = await getOrCreateDraft(classroomId);
  const validIds = new Set(draft.blocks.map((b) => b.id));
  // Only ever reorder blocks that actually belong to this classroom's own
  // draft - silently drops anything else rather than trusting the list
  // wholesale, since a stale/tampered id list shouldn't be able to touch
  // another classroom's data.
  const safeOrderedIds = orderedIds.filter((id) => validIds.has(id));

  await prisma.$transaction(
    safeOrderedIds.map((id, index) =>
      prisma.newsletterBlock.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
