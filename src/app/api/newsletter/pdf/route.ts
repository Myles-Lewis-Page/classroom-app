import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, getUpcomingEvents } from "@/lib/newsletter";
import { getUpcomingSpellingList } from "@/lib/spelling";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";
import { renderNewsletterPdf } from "@/lib/newsletterPdf";

// GET - the current draft newsletter as a downloadable PDF. This exists
// specifically so the Weekly Report doesn't have to inline the newsletter
// as plain text in the parent email body: since this app has no real
// outbound email (delivery is a mailto: link, which can only carry plain
// text with no attachment support at all), she downloads this once and
// attaches it herself in her actual email client instead.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;

  const [draft, classroom, upcomingEvents, shortfalls, upcomingSpellingList] = await Promise.all([
    getOrCreateDraft(classroomId),
    prisma.classroom.findUnique({ where: { id: classroomId }, select: { name: true } }),
    getUpcomingEvents(classroomId),
    getChaperoneShortfalls(classroomId),
    getUpcomingSpellingList(classroomId),
  ]);

  const pdfBuffer = await renderNewsletterPdf({
    classroomName: classroom?.name ?? "Our Classroom",
    weekLabel: `Week of ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}`,
    bannerTitle: draft.bannerTitle,
    bannerSubtitle: draft.bannerSubtitle,
    blocks: draft.blocks,
    upcomingEvents,
    shortfalls: shortfalls.map((s) => ({ ...s, link: chaperoneInterestUrl(s.id, baseUrl) })),
    upcomingSpellingWords: upcomingSpellingList?.words.map((w) => w.word) ?? [],
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="newsletter-${dateStr}.pdf"`,
    },
  });
}
