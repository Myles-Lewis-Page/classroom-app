import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks, getUpcomingEvents } from "@/lib/newsletter";

// GET - the current in-progress draft, a live-rendered plain-text preview
// (what actually goes in the parent email - see src/lib/newsletter.ts),
// the classroom name (for the visual banner), and upcoming events (for the
// visual "events" block, so the fancy preview doesn't need its own
// separate fetch/query for the same data the plain-text renderer already
// looked up).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const [draft, classroom, upcomingEvents] = await Promise.all([
    getOrCreateDraft(classroomId),
    prisma.classroom.findUnique({ where: { id: classroomId }, select: { name: true } }),
    getUpcomingEvents(classroomId),
  ]);
  const preview = await renderNewsletterBlocks(draft.blocks, classroomId);

  return NextResponse.json({
    newsletter: draft,
    preview,
    classroomName: classroom?.name ?? "Our Classroom",
    upcomingEvents,
  });
}
