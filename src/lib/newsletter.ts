import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/dateOnly";
import { getChaperoneShortfalls } from "@/lib/chaperones";
import { chaperoneInterestUrl } from "@/lib/qrcode";

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "divider",
  "image",
  "events",
  "chaperones",
  "spellingWords",
  "wordWall",
  "readingNow",
  "homeLearning",
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
  | { type: "paragraph"; text: string; color?: BlockColor }
  | { type: "list"; items: string[]; color?: BlockColor }
  | { type: "divider"; color?: BlockColor }
  | { type: "image"; url: string; caption?: string }
  | { type: "events"; color?: BlockColor }
  | { type: "chaperones"; color?: BlockColor }
  | { type: "spellingWords"; words: string[]; color?: BlockColor }
  | { type: "wordWall"; words: string[]; color?: BlockColor }
  | { type: "readingNow"; title: string; author?: string; questions: string[]; color?: BlockColor }
  | { type: "homeLearning"; items: string[]; color?: BlockColor };

export type RawBlock = { id?: string; type: string; content: unknown; order: number };
export type UpcomingEvent = { name: string; date: Date };

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
    case "chaperones":
      return { color: "coral" };
    case "spellingWords":
      return { words: [""], color: "sky" };
    case "wordWall":
      return { words: [""], color: "teal" };
    case "readingNow":
      return { title: "", author: "", questions: [""], color: "grape" };
    case "homeLearning":
      return { items: [""], color: "sunny" };
  }
}

/** This classroom's next 10 upcoming events, for the "events" block type. */
export async function getUpcomingEvents(classroomId: string): Promise<UpcomingEvent[]> {
  return prisma.event.findMany({
    where: { classroomId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 10,
    select: { name: true, date: true },
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
 * The "events" block is the one type that needs a DB lookup (this
 * classroom's upcoming events) - everything else is pure data-in,
 * string-out, which is what makes it safe to also use this at publish time
 * to freeze a historical snapshot.
 */
export async function renderNewsletterBlocks(
  blocks: RawBlock[],
  classroomId: string,
  baseUrl: string = process.env.NEXTAUTH_URL || ""
): Promise<string> {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  // Only bother querying events if a block actually needs it.
  const needsEvents = sorted.some((b) => b.type === "events");
  const upcomingEvents = needsEvents ? await getUpcomingEvents(classroomId) : [];
  const needsChaperones = sorted.some((b) => b.type === "chaperones");
  const shortfalls = needsChaperones ? await getChaperoneShortfalls(classroomId) : [];

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
        if (text) lines.push(text, "");
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
        // plain link, which is the honest, working version of "image" in a
        // plain-text email body.
        const url = String(content?.url ?? "").trim();
        const caption = String(content?.caption ?? "").trim();
        if (url) {
          lines.push(caption ? `[${caption}] ${url}` : url, "");
        }
        break;
      }
      case "events": {
        if (upcomingEvents.length) {
          lines.push("UPCOMING:");
          upcomingEvents.forEach((e) =>
            lines.push(`- ${e.name} — ${formatShortDate(e.date)}`)
          );
          lines.push("");
        }
        break;
      }
      case "chaperones": {
        // No QR code in plain text (can't embed images in a mailto body
        // anyway) - just the message and a plain link to tap/click, which
        // does the same job in an email.
        if (shortfalls.length) {
          lines.push("WE NEED MORE CHAPERONES:");
          shortfalls.forEach((s) => {
            lines.push(
              `- ${s.name} (${formatShortDate(s.date)}): ${s.confirmed} of ${s.needed} confirmed`,
              `  Sign up: ${chaperoneInterestUrl(s.id, baseUrl)}`
            );
          });
          lines.push("");
        }
        break;
      }
      case "spellingWords": {
        const words = (Array.isArray(content?.words) ? (content.words as string[]) : [])
          .map((w) => String(w).trim())
          .filter(Boolean);
        if (words.length) {
          lines.push("SPELLING WORDS:");
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
 * into a single paragraph block, so switching to the block system doesn't
 * silently lose whatever she'd already typed there.
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
        ? { create: [{ type: "paragraph", content: { text: legacyText }, order: 0 }] }
        : undefined,
    },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  return draft;
}
