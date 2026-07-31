import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/dateOnly";
import { getChaperoneShortfalls, type ChaperoneShortfall } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";
import { getUpcomingSpellingList } from "@/lib/spelling";

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "divider",
  "image",
  "events",
  "thisWeekEvents",
  "spellingWords",
  "wordWall",
  "readingNow",
  "homeLearning",
  "spacer",
] as const;
export type NewsletterBlockType = (typeof BLOCK_TYPES)[number];

// The five accent colors a block can be tagged with, used to color-code
// each card in the visual builder/print view the way a classroom
// newsletter template would (a coral "Important Dates" box, a teal
// "Specials" box, etc). Plain-text email rendering ignores this entirely -
// color only matters in the visual views.
export const BLOCK_COLORS = ["coral", "teal", "sunny", "grape", "sky"] as const;
export type BlockColor = (typeof BLOCK_COLORS)[number];

export type NewsletterBlockContent =
  | { type: "heading"; text: string; color?: BlockColor }
  | { type: "paragraph"; text: string; heading?: string; color?: BlockColor }
  | { type: "list"; items: string[]; color?: BlockColor }
  | { type: "divider"; color?: BlockColor }
  | { type: "image"; url: string; caption?: string }
  | { type: "events"; color?: BlockColor }
  | { type: "thisWeekEvents"; color?: BlockColor }
  | { type: "spellingWords"; color?: BlockColor }
  | { type: "wordWall"; words: string[]; color?: BlockColor }
  | { type: "readingNow"; title: string; author?: string; questions: string[]; color?: BlockColor }
  | { type: "homeLearning"; items: string[]; color?: BlockColor }
  | { type: "spacer" };

export type RawBlock = { id?: string; type: string; content: unknown; order: number; column?: number; span?: number };
export type UpcomingEvent = { id: string; name: string; date: Date };

/** A sensible starting shape for a freshly-added block of a given type. */
export function defaultContentForType(type: NewsletterBlockType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "New Heading", color: "coral" };
    case "paragraph":
      return { text: "", color: "sky" };
    case "list":
      return { items: [""], color: "teal" };
    case "divider":
      return { color: "sunny" };
    case "image":
      return { url: "", caption: "" };
    case "events":
      return { color: "grape" };
    case "thisWeekEvents":
      return { color: "sunny" };
    case "spellingWords":
      return { color: "sky" };
    case "wordWall":
      return { words: [""], color: "teal" };
    case "readingNow":
      return { title: "", author: "", questions: [""], color: "grape" };
    case "homeLearning":
      return { items: [""], color: "sunny" };
    case "spacer":
      return {};
  }
}

/**
 * A block's starting column/span on the 4-column grid when it's first
 * added - full-width for the "headline" style types (heading, divider,
 * events, readingNow), half-width for everything else. She can drag/resize
 * from there; this is just a sensible starting point.
 */
export function defaultLayoutForType(type: NewsletterBlockType): { column: number; span: number } {
  switch (type) {
    case "heading":
    case "divider":
    case "events":
    case "thisWeekEvents":
    case "readingNow":
      return { column: 1, span: 4 };
    default:
      return { column: 1, span: 2 };
  }
}

/**
 * The narrowest a block of this type is allowed to be. Word-list-style
 * blocks (list, spellingWords, wordWall, homeLearning) read fine as a
 * single narrow column - one item per line - so they can go down to 1.
 * Everything else (headings, paragraphs, images, the events/reading
 * blocks) needs more room to stay readable/laid out sensibly, so those
 * are floored at 2. Enforced both here (client-side option filtering) and
 * server-side in the block create/update routes - never trust the client
 * alone for a constraint like this.
 */
export function minSpanForType(type: NewsletterBlockType): number {
  switch (type) {
    case "list":
    case "spellingWords":
    case "wordWall":
    case "homeLearning":
    case "spacer":
      return 1;
    default:
      return 2;
  }
}

/** This classroom's next 10 upcoming events, for the "events" block type. */
export async function getUpcomingEvents(classroomId: string): Promise<UpcomingEvent[]> {
  return prisma.event.findMany({
    where: { classroomId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 10,
    select: { id: true, name: true, date: true },
  });
}

/**
 * Events falling within a specific 7-day window ending on weekEndDate
 * (inclusive) - "This Week's Events," as opposed to the "events"/
 * Important Dates block's rolling next-10-upcoming. With no weekEndDate,
 * defaults to the 7 days starting today, so the block still shows
 * something sensible before she's picked a week for the newsletter.
 */
export async function getEventsInWeek(classroomId: string, weekEndDate?: Date): Promise<UpcomingEvent[]> {
  let end: Date;
  let start: Date;
  if (weekEndDate) {
    end = new Date(weekEndDate);
    end.setHours(23, 59, 59, 999);
    start = new Date(weekEndDate);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }
  return prisma.event.findMany({
    where: { classroomId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    select: { id: true, name: true, date: true },
  });
}

/**
 * Renders a classroom's block list into the plain-text body that actually
 * goes out via the mailto: link on the Weekly Report - this app has no real
 * outbound email capability, so this is the final "delivered" form, not
 * just an internal preview format. Kept deliberately simple (headings as
 * ALL CAPS + underline, dividers as a rule, lists as "- " bullets) since
 * plain text can't carry real bold/italic/color no matter what the block
 * editor lets her type.
 *
 * There's no separate "chaperones" block type - any event that's short on
 * confirmed chaperones gets a note right under its own line within the
 * "events" block, since that's where a parent would actually be looking
 * for it.
 */
export async function renderNewsletterBlocks(
  blocks: RawBlock[],
  classroomId: string,
  baseUrl: string = process.env.NEXTAUTH_URL || "",
  weekEndDate?: Date | null
): Promise<string> {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  // Only bother querying events if a block actually needs it.
  const needsEvents = sorted.some((b) => b.type === "events" || b.type === "thisWeekEvents");
  const upcomingEvents = sorted.some((b) => b.type === "events") ? await getUpcomingEvents(classroomId) : [];
  const thisWeekEvents = sorted.some((b) => b.type === "thisWeekEvents")
    ? await getEventsInWeek(classroomId, weekEndDate ?? undefined)
    : [];
  const shortfalls: ChaperoneShortfall[] = needsEvents ? await getChaperoneShortfalls(classroomId) : [];
  const shortfallById = new Map(shortfalls.map((s) => [s.id, s]));
  const needsSpelling = sorted.some((b) => b.type === "spellingWords");
  const upcomingSpellingList = needsSpelling
    ? await getUpcomingSpellingList(classroomId, weekEndDate ?? undefined)
    : null;

  for (const block of sorted) {
    const content = block.content as Record<string, unknown>;
    switch (block.type) {
      case "heading": {
        const text = String(content?.text ?? "").trim();
        if (text) lines.push(text.toUpperCase(), "-".repeat(Math.min(text.length, 40)), "");
        break;
      }
      case "paragraph": {
        const text = String(content?.text ?? "").trim();
        const heading = String(content?.heading ?? "").trim();
        if (heading) lines.push(heading.toUpperCase());
        if (text) lines.push(text, "");
        else if (heading) lines.push("");
        break;
      }
      case "list": {
        const items = Array.isArray(content?.items) ? (content.items as string[]) : [];
        const nonEmpty = items.map((i) => String(i).trim()).filter(Boolean);
        if (nonEmpty.length) {
          nonEmpty.forEach((item) => lines.push(`- ${item}`));
          lines.push("");
        }
        break;
      }
      case "divider": {
        lines.push("――――――――――――――――――――", "");
        break;
      }
      case "image": {
        // No real outbound email in this app (delivery is a mailto: link),
        // so an actual embedded image isn't possible - this degrades to a
        // plain note, which is the honest, working version of "image" in a
        // plain-text email body (the URL itself is a long data: URI now
        // that images are uploaded rather than linked, so it's not worth
        // printing - just flag that there's a photo, visible in the
        // attached PDF).
        const url = String(content?.url ?? "").trim();
        const caption = String(content?.caption ?? "").trim();
        if (url) {
          lines.push(caption ? `[Photo: ${caption} - see attached PDF]` : "[Photo - see attached PDF]", "");
        }
        break;
      }
      case "events": {
        if (upcomingEvents.length) {
          lines.push("UPCOMING:");
          upcomingEvents.forEach((e) => {
            lines.push(`- ${e.name} — ${formatShortDate(e.date)}`);
            const shortfall = shortfallById.get(e.id);
            if (shortfall) {
              lines.push(
                `  Needs more chaperones (${shortfall.confirmed} of ${shortfall.needed} confirmed) - sign up: ${chaperoneInterestUrl(shortfall.id, baseUrl)}`
              );
            }
          });
          lines.push("");
        }
        break;
      }
      case "thisWeekEvents": {
        if (thisWeekEvents.length) {
          lines.push("THIS WEEK:");
          thisWeekEvents.forEach((e) => {
            lines.push(`- ${e.name} — ${formatShortDate(e.date)}`);
            const shortfall = shortfallById.get(e.id);
            if (shortfall) {
              lines.push(
                `  Needs more chaperones (${shortfall.confirmed} of ${shortfall.needed} confirmed) - sign up: ${chaperoneInterestUrl(shortfall.id, baseUrl)}`
              );
            }
          });
          lines.push("");
        }
        break;
      }
      case "spellingWords": {
        const words = upcomingSpellingList?.words.map((w) => w.word) ?? [];
        if (words.length) {
          lines.push(`SPELLING WORDS (${formatShortDate(upcomingSpellingList!.weekOf)}):`);
          words.forEach((w, i) => lines.push(`${i + 1}. ${w}`));
          lines.push("");
        }
        break;
      }
      case "wordWall": {
        const words = (Array.isArray(content?.words) ? (content.words as string[]) : [])
          .map((w) => String(w).trim())
          .filter(Boolean);
        if (words.length) {
          lines.push("WORD WALL:");
          words.forEach((w, i) => lines.push(`${i + 1}. ${w}`));
          lines.push("");
        }
        break;
      }
      case "readingNow": {
        const title = String(content?.title ?? "").trim();
        const author = String(content?.author ?? "").trim();
        const questions = (Array.isArray(content?.questions) ? (content.questions as string[]) : [])
          .map((q) => String(q).trim())
          .filter(Boolean);
        if (title) {
          lines.push(`WHAT WE'RE READING: ${title}${author ? ` by ${author}` : ""}`);
          if (questions.length) {
            lines.push("Ask your reader:");
            questions.forEach((q) => lines.push(`- ${q}`));
          }
          lines.push("");
        }
        break;
      }
      case "homeLearning": {
        const items = (Array.isArray(content?.items) ? (content.items as string[]) : [])
          .map((i) => String(i).trim())
          .filter(Boolean);
        if (items.length) {
          lines.push("LEARNING AT HOME:");
          items.forEach((item) => lines.push(`- ${item}`));
          lines.push("");
        }
        break;
      }
    }
  }

  return lines.join("\n").trim();
}

/**
 * Returns the classroom's current draft Newsletter (with blocks), creating
 * one if it doesn't exist yet. On first-ever creation, migrates any
 * content sitting in the old free-text Classroom.newsletterContent field
 * into a single full-width paragraph block, so switching to the block
 * system doesn't silently lose whatever she'd already typed there.
 */
export async function getOrCreateDraft(classroomId: string) {
  const existing = await prisma.newsletter.findFirst({
    where: { classroomId, status: "draft" },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { newsletterContent: true },
  });
  const legacyText = classroom?.newsletterContent?.trim();

  const draft = await prisma.newsletter.create({
    data: {
      classroomId,
      status: "draft",
      blocks: legacyText
        ? {
            create: [
              { type: "paragraph", content: { text: legacyText, color: "sky" }, order: 0, column: 1, span: 4 },
            ],
          }
        : undefined,
    },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  return draft;
}
