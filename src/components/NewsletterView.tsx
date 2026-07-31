import type { BlockColor } from "@/lib/newsletter";

export type ViewBlock = {
  id: string;
  type: "heading" | "paragraph" | "list" | "divider" | "image" | "events";
  content: Record<string, unknown>;
};

export type ViewEvent = { name: string; date: string | Date };

// Design tokens for the classroom-newsletter look: a cream page, five
// playful accent colors a teacher can tag each box with (mirroring how a
// printable classroom newsletter template uses color to separate sections
// - Important Dates in one color, Specials in another), Baloo 2 for the
// bubbly display type, Nunito for body copy, and Kalam for the one
// handwritten accent (image captions + the sign-off) - used sparingly, so
// it stays a signature touch rather than the whole page shouting at once.
const COLOR_CLASSES: Record<BlockColor, { border: string; bg: string; tint: string; text: string }> = {
  coral: { border: "border-[#FF6B6B]", bg: "bg-[#FF6B6B]", tint: "bg-[#FF6B6B]/10", text: "text-[#FF6B6B]" },
  teal: { border: "border-[#2EC4B6]", bg: "bg-[#2EC4B6]", tint: "bg-[#2EC4B6]/10", text: "text-[#2EC4B6]" },
  sunny: { border: "border-[#F4A300]", bg: "bg-[#F4A300]", tint: "bg-[#F4A300]/10", text: "text-[#B67600]" },
  grape: { border: "border-[#9B5DE5]", bg: "bg-[#9B5DE5]", tint: "bg-[#9B5DE5]/10", text: "text-[#9B5DE5]" },
  sky: { border: "border-[#3FA7D6]", bg: "bg-[#3FA7D6]", tint: "bg-[#3FA7D6]/10", text: "text-[#2C86AD]" },
};

const BLOCK_ICON: Record<ViewBlock["type"], string> = {
  heading: "✏️",
  paragraph: "💬",
  list: "✅",
  divider: "🌟",
  image: "📷",
  events: "📅",
};

function colorFor(content: Record<string, unknown>, fallback: BlockColor): BlockColor {
  const c = content?.color as BlockColor | undefined;
  return c && c in COLOR_CLASSES ? c : fallback;
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
  blocks,
  upcomingEvents,
}: {
  classroomName: string;
  weekLabel: string;
  blocks: ViewBlock[];
  upcomingEvents: ViewEvent[];
}) {
  return (
    <div
      className="rounded-3xl border-4 border-dashed border-[#F4A300] p-4 sm:p-6"
      style={{ backgroundColor: "#FFFBF2", fontFamily: "'Nunito', sans-serif", color: "#2D2A26" }}
    >
      {/* Hero banner - the one signature element the rest of the page stays quiet around */}
      <div className="rounded-2xl mb-5 p-5 text-center bg-gradient-to-r from-[#FF6B6B] via-[#F4A300] to-[#9B5DE5]">
        <p className="text-white/90 text-sm font-semibold tracking-wide" style={{ fontFamily: "'Kalam', cursive" }}>
          🍎 {weekLabel} 🍎
        </p>
        <h1
          className="text-white text-3xl sm:text-4xl font-extrabold drop-shadow-sm"
          style={{ fontFamily: "'Baloo 2', sans-serif" }}
        >
          {classroomName}&apos;s Newsletter
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {blocks.map((block) => (
          <BlockCard key={block.id} block={block} upcomingEvents={upcomingEvents} />
        ))}
        {blocks.length === 0 && (
          <p className="sm:col-span-2 text-center text-[#9b8f7a] py-10" style={{ fontFamily: "'Kalam', cursive" }}>
            Nothing here yet - add a block to get started!
          </p>
        )}
      </div>

      <p
        className="text-center text-sm text-[#9b8f7a] mt-6"
        style={{ fontFamily: "'Kalam', cursive" }}
      >
        With love, your teacher 💛
      </p>
    </div>
  );
}

function BlockCard({ block, upcomingEvents }: { block: ViewBlock; upcomingEvents: ViewEvent[] }) {
  const { type, content } = block;

  if (type === "divider") {
    const color = colorFor(content, "sunny");
    const c = COLOR_CLASSES[color];
    return (
      <div className="sm:col-span-2 flex items-center gap-3 py-1">
        <div className={`flex-1 border-t-4 border-dashed ${c.border}`} />
        <span className="text-xl">{BLOCK_ICON.divider}</span>
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
        className={`sm:col-span-2 text-2xl font-bold ${c.text} border-b-4 ${c.border} pb-1`}
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
    if (!text) return null;
    return (
      <div className={`rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    );
  }

  if (type === "list") {
    const color = colorFor(content, "teal");
    const c = COLOR_CLASSES[color];
    const items = ((content?.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div className={`rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`${c.text} font-bold mt-0.5`}>✓</span>
              <span>{item}</span>
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
      <div className="bg-white p-2 pb-4 rounded shadow-md border border-[#eee] -rotate-1">
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
    const c = COLOR_CLASSES[color];
    return (
      <div className={`rounded-2xl border-4 ${c.border} ${c.tint} p-4`}>
        <p className={`font-bold ${c.text} mb-2`} style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          📅 Important Dates
        </p>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-[#9b8f7a]">Nothing on the calendar yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcomingEvents.map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{e.name}</span>
                <span className={`${c.text} font-semibold whitespace-nowrap`}>
                  {new Date(e.date).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}

export { COLOR_CLASSES };
