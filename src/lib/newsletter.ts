import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/dateOnly";

export const BLOCK_TYPES = ["heading", "paragraph", "list", "divider", "image", "events"] as const;
export type NewsletterBlockType = (typeof BLOCK_TYPES)[number];

export type NewsletterBlockContent =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "divider" }
  | { type: "image"; url: string; caption?: string }
  | { type: "events" };

export type RawBlock = { id?: string; type: string; content: unknown; order: number };

/** A sensible starting shape for a freshly-added block of a given type. */
export function defaultContentForType(type: NewsletterBlockType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "New Heading" };
    case "paragraph":
      return { text: "" };
    case "list":
      return { items: [""] };
    case "divider":
      return {};
    case "image":
      return { url: "", caption: "" };
    case "events":
      return {};
  }
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
  classroomId: string
): Promise<string> {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  // Only bother querying events if a block actually needs it.
  const needsEvents = sorted.some((b) => b.type === "events");
  const upcomingEvents = needsEvents
    ? await prisma.event.findMany({
        where: { classroomId, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 10,
        select: { name: true, date: true },
      })
    : [];

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
