import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// GET ?eventId=xxx - public event info only. Privacy-critical: this route
// is reachable via a link shared directly with parents, with no auth and
// no session. It must NEVER return the student roster (or anything else
// about the classroom) - a public link should not be able to hand a class
// roster to anyone who has the URL. The parent types their child's name
// as free text on the client instead (see POST below).
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, date: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

// POST { eventId, studentName, parentName, contactInfo, note? } - records
// interest only. Does NOT create an EventChaperone, and does NOT look up
// or validate the student against the roster (the whole point is this
// route never touches roster data) - the teacher reviews these and links
// them to a real student herself, manually, after reaching out.
export async function POST(req: NextRequest) {
  // Unauthenticated public route - rate limit per IP to prevent spam/abuse
  // of this form (it writes to the DB on every submission).
  const ip = getClientIp(req);
  const limit = checkRateLimit(`chaperone-interest:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const eventId = body.eventId as string;
  const studentName = (body.studentName ?? "").trim();
  const parentName = (body.parentName ?? "").trim();
  const contactInfo = (body.contactInfo ?? "").trim();
  const note = (body.note ?? "").trim();

  if (!eventId || !studentName || !parentName || !contactInfo) {
    return NextResponse.json(
      { error: "eventId, studentName, parentName, and contactInfo are all required" },
      { status: 400 }
    );
  }
  // Cheap sanity caps - this is an unauthenticated public form, so bound
  // input sizes rather than trusting the client.
  if (studentName.length > 200 || parentName.length > 200 || contactInfo.length > 200 || note.length > 2000) {
    return NextResponse.json({ error: "One of the fields is too long." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chaperoneInterest.create({
    data: { eventId, studentName, parentName, contactInfo, note: note || null },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
