import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 12, color: "#222" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 10, color: "#666", textAlign: "center", marginBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  headerField: { fontSize: 12 },
  headerLine: { borderBottomWidth: 1, borderBottomColor: "#333", width: 180, marginLeft: 6 },
  wordRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16 },
  wordNumber: { width: 24, fontFamily: "Helvetica-Bold" },
  wordLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#333", height: 16 },
});

/**
 * A single generic test sheet - used both for the no-name master list
 * (studentName omitted) and, one per page, for personalized makeup sheets
 * (studentName filled in, word list is just that student's own misses).
 */
function TestSheet({
  studentName,
  weekLabel,
  words,
}: {
  studentName?: string;
  weekLabel: string;
  words: string[];
}) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>Spelling Test</Text>
      <Text style={styles.subtitle}>{weekLabel}</Text>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.headerField}>Name:</Text>
          <Text style={[styles.headerLine, studentName ? { borderBottomWidth: 0 } : {}]}>
            {studentName ?? ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.headerField}>Date:</Text>
          <View style={[styles.headerLine, { width: 100 }]} />
        </View>
      </View>
      {words.map((_, i) => (
        <View style={styles.wordRow} key={i}>
          <Text style={styles.wordNumber}>{i + 1}.</Text>
          <View style={styles.wordLine} />
        </View>
      ))}
    </Page>
  );
}

/** No-name master list for the first test - one page, print as many copies as needed. */
export async function renderMasterTestSheet(args: { weekLabel: string; words: string[] }): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <TestSheet weekLabel={args.weekLabel} words={args.words} />
    </Document>
  );
}

/** One personalized page per student needing a makeup, all in a single file. */
export async function renderMakeupTestSheets(args: {
  weekLabel: string;
  students: { name: string; words: string[] }[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {args.students.map((s, i) => (
        <TestSheet key={i} studentName={s.name} weekLabel={args.weekLabel} words={s.words} />
      ))}
    </Document>
  );
}
