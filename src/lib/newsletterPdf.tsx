import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatShortDate } from "@/lib/dateOnly";
import { qrCodeImageUrl } from "@/lib/qrcode";
import type { BlockColor } from "@/lib/newsletter";

type PdfBlock = { id: string; type: string; content: unknown };
type PdfEvent = { name: string; date: Date | string };
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
  banner: { backgroundColor: "#FF6B6B", borderRadius: 8, padding: 16, marginBottom: 16, textAlign: "center" },
  bannerWeek: { color: "#FFF3F0", fontSize: 10, marginBottom: 4 },
  bannerTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Helvetica-Bold" },
  block: { marginBottom: 10, padding: 10, borderRadius: 6, borderWidth: 1.5 },
  heading: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 10, paddingBottom: 4, borderBottomWidth: 2 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  eventRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  chapRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 8 },
  image: { width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 4 },
  caption: { fontSize: 9, textAlign: "center", marginTop: 4, color: "#6b6459" },
  signoff: { textAlign: "center", fontSize: 10, color: "#9b8f7a", marginTop: 16 },
});

function colorFor(content: Record<string, unknown>, fallback: BlockColor): BlockColor {
  const c = content?.color as BlockColor | undefined;
  return c && c in COLORS ? c : fallback;
}

function BlockView({
  block,
  upcomingEvents,
  shortfalls,
}: {
  block: PdfBlock;
  upcomingEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
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
    if (!text) return null;
    const c = COLORS[colorFor(content, "sky")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
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
    return <View style={{ borderBottomWidth: 2, borderBottomColor: c.border, borderStyle: "dashed", marginVertical: 8 }} />;
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
    const c = COLORS[colorFor(content, "grape")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>Important Dates</Text>
        {upcomingEvents.length === 0 ? (
          <Text style={{ color: "#9b8f7a" }}>Nothing on the calendar yet.</Text>
        ) : (
          upcomingEvents.map((e, i) => (
            <View style={styles.eventRow} key={i}>
              <Text>{e.name}</Text>
              <Text style={{ color: c.text, fontFamily: "Helvetica-Bold" }}>{formatShortDate(e.date)}</Text>
            </View>
          ))
        )}
      </View>
    );
  }

  if (type === "chaperones") {
    if (shortfalls.length === 0) return null;
    const c = COLORS[colorFor(content, "coral")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>We Need More Chaperones</Text>
        {shortfalls.map((s) => (
          <View style={styles.chapRow} key={s.id}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrCodeImageUrl(s.link, 150)} style={{ width: 64, height: 64 }} />
            <View>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{s.name}</Text>
              <Text style={{ fontSize: 9, color: "#6b6459" }}>
                {formatShortDate(s.date)} · {s.confirmed} of {s.needed} confirmed
              </Text>
              <Text style={{ fontSize: 9, color: c.text }}>Scan to sign up</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === "spellingWords" || type === "wordWall") {
    const words = ((content?.words as string[]) ?? []).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return null;
    const c = COLORS[colorFor(content, type === "spellingWords" ? "sky" : "teal")];
    return (
      <View style={{ ...styles.block, borderColor: c.border, backgroundColor: c.tint }}>
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>
          {type === "spellingWords" ? "Spelling Words" : "Word Wall"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {words.map((w, i) => (
            <Text key={i} style={{ width: "50%", marginBottom: 2 }}>
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
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>What We&apos;re Reading</Text>
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
        <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>Learning at Home</Text>
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
  blocks,
  upcomingEvents,
  shortfalls,
}: {
  classroomName: string;
  weekLabel: string;
  blocks: PdfBlock[];
  upcomingEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.banner}>
          <Text style={styles.bannerWeek}>{weekLabel}</Text>
          <Text style={styles.bannerTitle}>{classroomName}&apos;s Newsletter</Text>
        </View>
        {blocks.map((block) => (
          <BlockView key={block.id} block={block} upcomingEvents={upcomingEvents} shortfalls={shortfalls} />
        ))}
        <Text style={styles.signoff}>With love, your teacher</Text>
      </Page>
    </Document>
  );
}

export async function renderNewsletterPdf(args: {
  classroomName: string;
  weekLabel: string;
  blocks: PdfBlock[];
  upcomingEvents: PdfEvent[];
  shortfalls: PdfShortfall[];
}): Promise<Buffer> {
  return renderToBuffer(<NewsletterPdfDocument {...args} />);
}
