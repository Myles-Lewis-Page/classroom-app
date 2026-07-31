import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatShortDate } from "@/lib/dateOnly";
import { qrCodeImageUrl } from "@/lib/qrcode";
import { getMonthlyTheme } from "@/lib/monthlyTheme";
import type { BlockColor } from "@/lib/newsletter";

type PdfBlock = { id: string; type: string; content: unknown; span?: number };
type PdfEvent = { id: string; name: string; date: Date | string };
type PdfShortfall = { id: string; name: string; date: Date | string; needed: number; confirmed: number; link: string };

// Same accent palette as the web/print view (src/components/NewsletterView.tsx)
// - kept as plain hex here since react-pdf doesn't use Tailwind/CSS classes.
// No custom display font is registered (Baloo 2/Kalam from the web view) -
// react-pdf needs fonts pre-fetched as font files rather than a stylesheet
// link, which adds real fragility for a background PDF render; Helvetica
// Bold reads perfectly well for a printed/attached newsletter on its own.
const COLORS: Record<BlockColor, { border: string; tint: string; text: string }> = {
  coral: { border: "#FF6B6B", tint: "#FFF0F0", text: "#E14F4F" },
  teal: { border: "#2EC4B6", tint: "#EDFBFA", text: "#1F9187" },
  sunny: { border: "#F4A300", tint: "#FFF7E6", text: "#B67600" },
  grape: { border: "#9B5DE5", tint: "#F6EFFD", text: "#7C3FC4" },
  sky: { border: "#3FA7D6", tint: "#EEF8FC", text: "#2C86AD" },
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica", color: "#2D2A26" },
  banner: { borderRadius: 8, padding: 16, marginBottom: 16, textAlign: "center" },
  bannerWeek: { fontSize: 10, marginBottom: 4 },
  bannerTitle: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", marginBottom: 10 },
  block: { padding: 10, borderRadius: 6, borderWidth: 1.5, marginRight: 8 },
  heading: { fontSize: 15, fontFamily: "Helvetica-Bold", paddingBottom: 4, borderBottomWidth: 2, textAlign: "center" },
  listItem: { flexDirection: "row", marginBottom: 2 },
  eventItem: { marginBottom: 6 },
  eventRow: { flexDirection: "row", justifyContent: "space-between" },
  chapRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 3, backgroundColor: "#ffffff", borderRadius: 4, padding: 4 },
  image: { width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 4 },
  caption: { fontSize: 9, textAlign: "center", marginTop: 4, color: "#6b6459" },
});

function colorFor(content: Record<string, unknown>, fallback: BlockColor): BlockColor {
  const c = content?.color as BlockColor | undefined;
  return c && c in COLORS ? c : fallback;
}

/**
 * Groups blocks into rows for the PDF, using each block's span (1-4) as a
 * fraction of a 4-unit row width. This mirrors the web/print grid (see
 * NewsletterView.tsx) without needing true CSS grid, which react-pdf
 * doesn't support - a simple left-to-right row packer reads close enough
 * for a one-column-reading-order document like a printed page. Explicit
 * "column" position isn't respected here (only span/width), since a fixed
 * page width makes an exact column match less important than just not
 * overflowing a row.
 */
function packRows(blocks: PdfBlock[]): PdfBlock[][] {
  const rows: PdfBlock[][] = [];
  let current: PdfBlock[] = [];
  let used = 0;
  for (const block of blocks) {
    const span = Math.min(4, Math.max(1, block.span ?? 2));
    if (used + span > 4 && current.length > 0) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(block);
    used += span;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

function EventsBlock({
  label,
  color,
  events,
  shortfallById,
  emptyText,
}: {
  label: string;
  color: BlockColor;
  events: PdfEvent[];
  shortfallById: Map<string, PdfShortfall>;
  emptyText: string;
}) {
  const c = COLORS[color];
  return (
    <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
      <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6, textAlign: "center" }}>{label}</Text>
      {events.length === 0 ? (
        <Text style={{ color: "#9b8f7a" }}>{emptyText}</Text>
      ) : (
        events.map((e) => {
          const shortfall = shortfallById.get(e.id);
          return (
            <View style={styles.eventItem} key={e.id}>
              <View style={styles.eventRow}>
                <Text>{e.name}</Text>
                <Text style={{ color: c.text, fontFamily: "Helvetica-Bold" }}>{formatShortDate(e.date)}</Text>
              </View>
              {shortfall && (
                <View style={styles.chapRow}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={qrCodeImageUrl(shortfall.link, 100)} style={{ width: 32, height: 32 }} />
                  <Text style={{ fontSize: 8, color: c.text }}>
                    Needs more chaperones{"\n"}
                    {shortfall.confirmed} of {shortfall.needed} confirmed - scan to sign up
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function BlockContent({
  block,
  upcomingEvents,
  thisWeekEvents,
  shortfalls,
  upcomingSpellingWords,
}: {
  block: PdfBlock;
  upcomingEvents: PdfEvent[];
  thisWeekEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
  upcomingSpellingWords: string[];
}) {
  const { type } = block;
  const content = (block.content ?? {}) as Record<string, unknown>;

  if (type === "heading") {
    const text = String(content?.text ?? "").trim();
    if (!text) return null;
    const c = COLORS[colorFor(content, "coral")];
    return <Text style={{ ...styles.heading, color: c.text, borderBottomColor: c.border }}>{text}</Text>;
  }

  if (type === "paragraph") {
    const text = String(content?.text ?? "").trim();
    const heading = String(content?.heading ?? "").trim();
    if (!text && !heading) return null;
    const c = COLORS[colorFor(content, "sky")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        {heading && (
          <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 4, textAlign: "center" }}>
            {heading}
          </Text>
        )}
        <Text>{text}</Text>
      </View>
    );
  }

  if (type === "list") {
    const items = ((content?.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return null;
    const c = COLORS[colorFor(content, "teal")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        {items.map((item, i) => (
          <View style={styles.listItem} key={i}>
            <Text style={{ color: c.text, marginRight: 6 }}>{"\u2022"}</Text>
            <Text>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === "divider") {
    const c = COLORS[colorFor(content, "sunny")];
    return <View style={{ borderBottomWidth: 2, borderBottomColor: c.border, borderStyle: "dashed", marginVertical: 4 }} />;
  }

  if (type === "image") {
    const url = String(content?.url ?? "").trim();
    const caption = String(content?.caption ?? "").trim();
    if (!url) return null;
    return (
      <View style={{ ...styles.block, borderColor: "#eeeeee", backgroundColor: "#ffffff" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={url} style={styles.image} />
        {caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
    );
  }

  if (type === "events") {
    const shortfallById = new Map(shortfalls.map((s) => [s.id, s]));
    return (
      <EventsBlock label="Important Dates" color={colorFor(content, "grape")} events={upcomingEvents} shortfallById={shortfallById} emptyText="Nothing on the calendar yet." />
    );
  }

  if (type === "thisWeekEvents") {
    const shortfallById = new Map(shortfalls.map((s) => [s.id, s]));
    return (
      <EventsBlock label="This Week" color={colorFor(content, "sunny")} events={thisWeekEvents} shortfallById={shortfallById} emptyText="Nothing scheduled this week." />
    );
  }

  if (type === "spellingWords") {
    if (upcomingSpellingWords.length === 0) return null;
    const c = COLORS[colorFor(content, "sky")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6, textAlign: "center" }}>Spelling Words</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {upcomingSpellingWords.map((w, i) => (
            <Text key={i} style={{ width: `${100 / Math.max(1, block.span ?? 2)}%`, marginBottom: 2 }}>
              {i + 1}. {w}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (type === "wordWall") {
    const words = ((content?.words as string[]) ?? []).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return null;
    const c = COLORS[colorFor(content, "teal")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6, textAlign: "center" }}>Word Wall</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {words.map((w, i) => (
            <Text key={i} style={{ width: `${100 / Math.max(1, block.span ?? 2)}%`, marginBottom: 2 }}>
              {i + 1}. {w}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (type === "readingNow") {
    const title = String(content?.title ?? "").trim();
    const author = String(content?.author ?? "").trim();
    const questions = ((content?.questions as string[]) ?? []).map((q) => q.trim()).filter(Boolean);
    if (!title) return null;
    const c = COLORS[colorFor(content, "grape")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 2, textAlign: "center" }}>What We&apos;re Reading</Text>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>
          {title}
          {author ? ` by ${author}` : ""}
        </Text>
        {questions.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 9, color: "#6b6459", marginBottom: 2 }}>Ask your reader:</Text>
            {questions.map((q, i) => (
              <View style={styles.listItem} key={i}>
                <Text style={{ color: c.text, marginRight: 6 }}>{"\u2022"}</Text>
                <Text>{q}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (type === "homeLearning") {
    const items = ((content?.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return null;
    const c = COLORS[colorFor(content, "sunny")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6, textAlign: "center" }}>Learning at Home</Text>
        {items.map((item, i) => (
          <View style={styles.listItem} key={i}>
            <Text style={{ color: c.text, marginRight: 6 }}>{"\u2022"}</Text>
            <Text>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  return null;
}

function NewsletterPdfDocument({
  classroomName,
  weekLabel,
  bannerTitle,
  bannerSubtitle,
  blocks,
  upcomingEvents,
  thisWeekEvents,
  shortfalls,
  upcomingSpellingWords,
}: {
  classroomName: string;
  weekLabel: string;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  blocks: PdfBlock[];
  upcomingEvents: PdfEvent[];
  thisWeekEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
  upcomingSpellingWords: string[];
}) {
  const title = bannerTitle?.trim() || `${classroomName}'s Newsletter`;
  const subtitle = bannerSubtitle?.trim() || weekLabel;
  const theme = getMonthlyTheme();
  const rows = packRows(blocks);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={{ ...styles.banner, backgroundColor: theme.gradient[0] }}>
          <Text style={{ ...styles.bannerWeek, color: theme.textColor === "light" ? "#FFF3F0" : "#2D2A26" }}>{subtitle}</Text>
          <Text style={{ ...styles.bannerTitle, color: theme.textColor === "light" ? "#FFFFFF" : "#2D2A26" }}>{title}</Text>
        </View>
        {rows.map((row, i) => (
          <View style={styles.row} key={i}>
            {row.map((block) => (
              <View key={block.id} style={{ flex: Math.min(4, Math.max(1, block.span ?? 2)) }}>
                <BlockContent block={block} upcomingEvents={upcomingEvents} thisWeekEvents={thisWeekEvents} shortfalls={shortfalls} upcomingSpellingWords={upcomingSpellingWords} />
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderNewsletterPdf(args: {
  classroomName: string;
  weekLabel: string;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  blocks: PdfBlock[];
  upcomingEvents: PdfEvent[];
  thisWeekEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
  upcomingSpellingWords: string[];
}): Promise<Buffer> {
  return renderToBuffer(<NewsletterPdfDocument {...args} />);
}
