import type { CSSProperties } from "react";
import type { BlockColor } from "@/lib/newsletter";
import { qrCodeImageUrl } from "@/lib/qrcode";
import { getMonthlyTheme } from "@/lib/monthlyTheme";
import { SeasonalIcon } from "@/components/SeasonalIcons";

export type ViewBlock = {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "list"
    | "divider"
    | "image"
    | "events"
    | "thisWeekEvents"
    | "spellingWords"
    | "wordWall"
    | "readingNow"
    | "homeLearning"
    | "spacer";
  content: Record<string, unknown>;
  // Explicit position on the grid: column/row are the top-left cell (1-4
  // for column; row is open-ended), span/height are how many
  // columns/rows it occupies. Defaults come from defaultLayoutForType in
  // src/lib/newsletter.ts if missing, so older data still renders
  // reasonably. Collisions are checked server-side before a placement is
  // ever saved - see src/lib/newsletterGrid.ts - so anything reaching
  // this component should already be a non-overlapping layout.
  column?: number;
  span?: number;
  row?: number;
  height?: number;
};

export type ViewEvent = { id: string; name: string; date: string | Date };
export type ViewShortfall = {
  id: string;
  name: string;
  date: string | Date;
  needed: number;
  confirmed: number;
  // Pre-built by the server (see /api/newsletter/draft) - never build this
  // URL client-side, since it needs the server's base URL/origin.
  link: string;
};

// Design tokens for the classroom-newsletter look: a cream page, five
// playful accent colors a teacher can tag each box with (mirroring how a
// printable classroom newsletter template uses color to separate sections
// - Important Dates in one color, Specials in another), Baloo 2 for the
// bubbly display type, Nunito for body copy, and Kalam for the one
// handwritten accent (image captions) - used sparingly, so it stays a
// signature touch rather than the whole page shouting at once.
const COLOR_CLASSES: Record<BlockColor, { border: string; bg: string; tint: string; text: string }> = {
  coral: { border: "border-[#FF6B6B]", bg: "bg-[#FF6B6B]", tint: "bg-[#FF6B6B]/10", text: "text-[#FF6B6B]" },
  teal: { border: "border-[#2EC4B6]", bg: "bg-[#2EC4B6]", tint: "bg-[#2EC4B6]/10", text: "text-[#2EC4B6]" },
  sunny: { border: "border-[#F4A300]", bg: "bg-[#F4A300]", tint: "bg-[#F4A300]/10", text: "text-[#B67600]" },
  grape: { border: "border-[#9B5DE5]", bg: "bg-[#9B5DE5]", tint: "bg-[#9B5DE5]/10", text: "text-[#9B5DE5]" },
  sky: { border: "border-[#3FA7D6]", bg: "bg-[#3FA7D6]", tint: "bg-[#3FA7D6]/10", text: "text-[#2C86AD]" },
};

function colorFor(content: Record<string, unknown>, fallback: BlockColor): BlockColor {
  const c = content?.color as BlockColor | undefined;
  return c && c in COLOR_CLASSES ? c : fallback;
}

/** Clamps a block's grid position so it can never render off the 4-column grid. */
function gridStyle(column = 1, span = 2, row = 1, height = 1): CSSProperties {
  const safeColumn = Math.min(4, Math.max(1, column));
  const safeSpan = Math.min(span, 5 - safeColumn);
  const safeRow = Math.max(1, row);
  const safeHeight = Math.max(1, height);
  return {
    gridColumn: `${safeColumn} / span ${safeSpan}`,
    gridRow: `${safeRow} / span ${safeHeight}`,
  };
}

export function NewsletterFonts() {
  // Scoped to wherever this is rendered - loaded via a plain stylesheet
  // link rather than next/font since this is a page-local design choice,
  // not a site-wide typeface.
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700&family=Kalam:wght@400;700&display=swap"
    />
  );
}

export default function NewsletterView({
  classroomName,
  weekLabel,
  bannerTitle,
  bannerSubtitle,
  blocks,
  upcomingEvents,
  thisWeekEvents = [],
  shortfalls = [],
  upcomingSpellingWords = [],
}: {
  classroomName: string;
  weekLabel: string;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  blocks: ViewBlock[];
  upcomingEvents: ViewEvent[];
  thisWeekEvents?: ViewEvent[];
  shortfalls?: ViewShortfall[];
  upcomingSpellingWords?: string[];
}) {
  const title = bannerTitle?.trim() || `${classroomName}'s Newsletter`;
  const subtitle = bannerSubtitle?.trim() || weekLabel;
  const theme = getMonthlyTheme();
  const shortfallById = new Map(shortfalls.map((s) => [s.id, s]));

  return (
    <div
      className="rounded-3xl border-4 border-dashed border-[#F4A300] p-4 sm:p-6"
      style={{ backgroundColor: "#FFFBF2", fontFamily: "'Nunito', sans-serif", color: "#2D2A26" }}
    >
      {/* Hero banner - the one signature element the rest of the page stays quiet around.
          Colors and the small corner icons shift with the current month
          (see src/lib/monthlyTheme.ts) - always secular seasonal motifs
          (snowflakes, a tree, a pumpkin, etc), never religious symbols,
          even in months with major religious holidays in them. */}
      <div
        className="relative overflow-hidden rounded-2xl mb-5 p-5 text-center"
        style={{ background: `linear-gradient(to right, ${theme.gradient[0]}, ${theme.gradient[1]}, ${theme.gradient[2]})` }}
      >
        <SeasonalIcon icon={theme.icon} size={32} className="absolute top-3 left-3 opacity-70" color={theme.textColor === "light" ? "#FFFFFF" : "#2D2A26"} />
        <SeasonalIcon icon={theme.icon} size={24} className="absolute bottom-3 right-4 opacity-50" color={theme.textColor === "light" ? "#FFFFFF" : "#2D2A26"} />
        <p
          className="text-sm font-semibold tracking-wide"
          style={{
            fontFamily: "'Kalam', cursive",
            color: theme.textColor === "light" ? "#FFFFFF" : "#2D2A26",
            textShadow: theme.textColor === "light" ? "0 1px 3px rgba(0,0,0,0.55)" : "0 1px 3px rgba(255,255,255,0.75)",
          }}
        >
          {subtitle}
        </p>
        <h1
          className="text-3xl sm:text-4xl font-extrabold"
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            color: theme.textColor === "light" ? "#FFFFFF" : "#2D2A26",
            textShadow: theme.textColor === "light" ? "0 2px 5px rgba(0,0,0,0.55)" : "0 2px 5px rgba(255,255,255,0.8)",
          }}
        >
          {title}
        </h1>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
        style={{ gridAutoRows: "minmax(140px, auto)" }}
      >
        {blocks.map((block) => (
          <div key={block.id} style={gridStyle(block.column, block.span, block.row, block.height)} className="min-w-0">
            <BlockCard block={block} upcomingEvents={upcomingEvents} thisWeekEvents={thisWeekEvents} shortfallById={shortfallById} upcomingSpellingWords={upcomingSpellingWords} />
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="sm:col-span-4 text-center text-[#9b8f7a] py-10" style={{ fontFamily: "'Kalam', cursive" }}>
            Nothing here yet - add a block to get started!
          </p>
        )}
      </div>
    </div>
  );
}

function EventsCard({
  label,
  color,
  events,
  shortfallById,
  emptyText,
}: {
  label: string;
  color: BlockColor;
  events: ViewEvent[];
  shortfallById: Map<string, ViewShortfall>;
  emptyText: string;
}) {
  const c = COLOR_CLASSES[color];
  return (
    <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
      <p className={`font-bold text-center ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
        {label}
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-[#9b8f7a]">{emptyText}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((e) => {
            const shortfall = shortfallById.get(e.id);
            return (
              <li key={e.id}>
                <div className="flex justify-between gap-2">
                  <span>{e.name}</span>
                  <span className={`${c.text} font-semibold whitespace-nowrap`}>
                    {new Date(e.date).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" })}
                  </span>
                </div>
                {/* Chaperone need sits right under this event's own date,
                    not as a separate block - so a parent scanning the
                    dates sees the ask exactly where it's relevant. */}
                {shortfall && (
                  <div className="flex items-center gap-2 mt-1 bg-white rounded-lg p-2 border border-[#eee]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeImageUrl(shortfall.link, 100)}
                      alt={`QR code to sign up to chaperone ${e.name}`}
                      className="w-10 h-10 shrink-0"
                    />
                    <p className="text-xs">
                      <span className={`${c.text} font-semibold`}>Needs more chaperones</span>
                      <br />
                      {shortfall.confirmed} of {shortfall.needed} confirmed - scan to sign up
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BlockCard({
  block,
  upcomingEvents,
  thisWeekEvents,
  shortfallById,
  upcomingSpellingWords,
}: {
  block: ViewBlock;
  upcomingEvents: ViewEvent[];
  thisWeekEvents: ViewEvent[];
  shortfallById: Map<string, ViewShortfall>;
  upcomingSpellingWords: string[];
}) {
  const { type, content } = block;

  if (type === "divider") {
    const color = colorFor(content, "sunny");
    const c = COLOR_CLASSES[color];
    return (
      <div className="flex items-center gap-3 py-1">
        <div className={`flex-1 border-t-4 border-dashed ${c.border}`} />
        <span className={`w-2 h-2 rounded-full ${c.bg}`} />
        <div className={`flex-1 border-t-4 border-dashed ${c.border}`} />
      </div>
    );
  }

  if (type === "heading") {
    const color = colorFor(content, "coral");
    const c = COLOR_CLASSES[color];
    const text = String(content?.text ?? "").trim();
    if (!text) return null;
    return (
      <h2
        className={`text-2xl font-bold text-center ${c.text} border-b-4 ${c.border} pb-1`}
        style={{ fontFamily: "'Baloo 2', sans-serif" }}
      >
        {text}
      </h2>
    );
  }

  if (type === "paragraph") {
    const color = colorFor(content, "sky");
    const c = COLOR_CLASSES[color];
    const text = String(content?.text ?? "").trim();
    const heading = String(content?.heading ?? "").trim();
    if (!text && !heading) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        {heading && (
          <p className={`font-bold text-center ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            {heading}
          </p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">{text}</p>
      </div>
    );
  }

  if (type === "list") {
    const color = colorFor(content, "teal");
    const c = COLOR_CLASSES[color];
    const items = ((content?.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`${c.text} font-bold mt-0.5`}>•</span>
              <span className="break-words [overflow-wrap:anywhere]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === "image") {
    const url = String(content?.url ?? "").trim();
    const caption = String(content?.caption ?? "").trim();
    if (!url) return null;
    return (
      <div className="h-full bg-white p-2 pb-4 rounded shadow-md border border-[#eee] -rotate-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={caption || "Newsletter photo"} className="w-full rounded-sm object-cover" />
        {caption && (
          <p className="text-center text-sm mt-2" style={{ fontFamily: "'Kalam', cursive" }}>
            {caption}
          </p>
        )}
      </div>
    );
  }

  if (type === "events") {
    const color = colorFor(content, "grape");
    return (
      <EventsCard label="Important Dates" color={color} events={upcomingEvents} shortfallById={shortfallById} emptyText="Nothing on the calendar yet." />
    );
  }

  if (type === "thisWeekEvents") {
    const color = colorFor(content, "sunny");
    return (
      <EventsCard label="This Week" color={color} events={thisWeekEvents} shortfallById={shortfallById} emptyText="Nothing scheduled this week." />
    );
  }

  if (type === "spellingWords") {
    const color = colorFor(content, "sky");
    const c = COLOR_CLASSES[color];
    if (upcomingSpellingWords.length === 0) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className={`font-bold text-center ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          Spelling Words
        </p>
        <ol className="grid gap-x-4 gap-y-1 text-sm list-decimal list-inside" style={{ gridTemplateColumns: `repeat(${Math.max(1, block.span ?? 2)}, minmax(0, 1fr))` }}>
          {upcomingSpellingWords.map((w, i) => (
            <li key={i} className="break-words [overflow-wrap:anywhere]">{w}</li>
          ))}
        </ol>
      </div>
    );
  }

  if (type === "wordWall") {
    const color = colorFor(content, "teal");
    const c = COLOR_CLASSES[color];
    const words = ((content?.words as string[]) ?? []).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className={`font-bold text-center ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          Word Wall
        </p>
        <ol className="grid gap-x-4 gap-y-1 text-sm list-decimal list-inside" style={{ gridTemplateColumns: `repeat(${Math.max(1, block.span ?? 2)}, minmax(0, 1fr))` }}>
          {words.map((w, i) => (
            <li key={i} className="break-words [overflow-wrap:anywhere]">{w}</li>
          ))}
        </ol>
      </div>
    );
  }

  if (type === "readingNow") {
    const color = colorFor(content, "grape");
    const c = COLOR_CLASSES[color];
    const title = String(content?.title ?? "").trim();
    const author = String(content?.author ?? "").trim();
    const questions = ((content?.questions as string[]) ?? []).map((q) => q.trim()).filter(Boolean);
    if (!title) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className={`font-bold text-center ${c.text} mb-1`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          What We&apos;re Reading
        </p>
        <p className="font-semibold">
          {title}
          {author && <span className="font-normal text-[#6b6459]"> by {author}</span>}
        </p>
        {questions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-[#6b6459] mb-1">Ask your reader:</p>
            <ul className="space-y-1 text-sm">
              {questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`${c.text} font-bold mt-0.5`}>•</span>
                  <span className="break-words [overflow-wrap:anywhere]">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (type === "homeLearning") {
    const color = colorFor(content, "sunny");
    const c = COLOR_CLASSES[color];
    const items = ((content?.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div className={`h-full rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className={`font-bold text-center ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          Learning at Home
        </p>
        <ul className="space-y-1.5 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`${c.text} font-bold mt-0.5`}>•</span>
              <span className="break-words [overflow-wrap:anywhere]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // "spacer" intentionally renders nothing - the grid wrapper div around
  // this component already reserves its column/row footprint, which is
  // the entire point (see src/lib/newsletterGrid.ts).
  return null;
}

export { COLOR_CLASSES };
