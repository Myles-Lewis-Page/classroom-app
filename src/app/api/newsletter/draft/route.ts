import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks, getUpcomingEvents, getEventsInWeek } from "@/lib/newsletter";
import { getUpcomingSpellingList } from "@/lib/spelling";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";

// GET - the current in-progress draft, a live-rendered plain-text preview
// (what actually goes in the parent email - see src/lib/newsletter.ts),
// the classroom name (for the visual banner), upcoming events (for the
// visual "events" block), this week's events (scoped to the draft's own
// weekEndDate, for the "This Week" block), and any chaperone shortfalls
// with their public sign-up links already built server-side (the client
// must never build this URL itself - it needs the server's base URL,
// which isn't available in the browser bundle).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;

  const draft = await getOrCreateDraft(classroomId);
  const weekEndDate = draft.weekEndDate ?? undefined;

  const [classroom, upcomingEvents, thisWeekEvents, shortfalls, upcomingSpellingList] = await Promise.all([
    prisma.classroom.findUnique({ where: { id: classroomId }, select: { name: true } }),
    getUpcomingEvents(classroomId),
    getEventsInWeek(classroomId, weekEndDate),
    getChaperoneShortfalls(classroomId),
    getUpcomingSpellingList(classroomId, weekEndDate),
  ]);
  const preview = await renderNewsletterBlocks(draft.blocks, classroomId, baseUrl, weekEndDate);

  return NextResponse.json({
    newsletter: draft,
    preview,
    classroomName: classroom?.name ?? "Our Classroom",
    upcomingEvents,
    thisWeekEvents,
    shortfalls: shortfalls.map((s) => ({ ...s, link: chaperoneInterestUrl(s.id, baseUrl) })),
    upcomingSpellingWords: upcomingSpellingList?.words.map((w) => w.word) ?? [],
  });
}

// PATCH { bannerTitle?, bannerSubtitle?, weekEndDate? } - updates the
// editable hero banner text and/or the real date this newsletter's week
// ends on (drives which spelling list and which events count as "this
// week" - see getUpcomingSpellingList/getEventsInWeek). weekEndDate can be
// cleared back to null (falls back to "the next 7 days from today").
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const draft = await getOrCreateDraft(classroomId);
  const body = await req.json();
  const data: { bannerTitle?: string | null; bannerSubtitle?: string | null; weekEndDate?: Date | null } = {};
  if (body.bannerTitle !== undefined) data.bannerTitle = body.bannerTitle || null;
  if (body.bannerSubtitle !== undefined) data.bannerSubtitle = body.bannerSubtitle || null;
  if (body.weekEndDate !== undefined) {
    data.weekEndDate = body.weekEndDate ? new Date(body.weekEndDate) : null;
  }

  const updated = await prisma.newsletter.update({ where: { id: draft.id }, data });
  return NextResponse.json(updated);
}
