import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks, getUpcomingEvents } from "@/lib/newsletter";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";

// GET - the current in-progress draft, a live-rendered plain-text preview
// (what actually goes in the parent email - see src/lib/newsletter.ts),
// the classroom name (for the visual banner), upcoming events (for the
// visual "events" block), and any chaperone shortfalls with their public
// sign-up links already built server-side (the client must never build
// this URL itself - it needs the server's base URL, which isn't available
// in the browser bundle).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;

  const [draft, classroom, upcomingEvents, shortfalls] = await Promise.all([
    getOrCreateDraft(classroomId),
    prisma.classroom.findUnique({ where: { id: classroomId }, select: { name: true } }),
    getUpcomingEvents(classroomId),
    getChaperoneShortfalls(classroomId),
  ]);
  const preview = await renderNewsletterBlocks(draft.blocks, classroomId, baseUrl);

  return NextResponse.json({
    newsletter: draft,
    preview,
    classroomName: classroom?.name ?? "Our Classroom",
    upcomingEvents,
    shortfalls: shortfalls.map((s) => ({ ...s, link: chaperoneInterestUrl(s.id, baseUrl) })),
  });
}

// PATCH { bannerTitle?, bannerSubtitle? } - updates the editable hero
// banner text on the current draft. Either field can be set back to null/
// empty to fall back to the computed default (classroom name + this
// week's date) - see NewsletterView's default props.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const draft = await getOrCreateDraft(classroomId);
  const body = await req.json();
  const data: { bannerTitle?: string | null; bannerSubtitle?: string | null } = {};
  if (body.bannerTitle !== undefined) data.bannerTitle = body.bannerTitle || null;
  if (body.bannerSubtitle !== undefined) data.bannerSubtitle = body.bannerSubtitle || null;

  const updated = await prisma.newsletter.update({ where: { id: draft.id }, data });
  return NextResponse.json(updated);
}
