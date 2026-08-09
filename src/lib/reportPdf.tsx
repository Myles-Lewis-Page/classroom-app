import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatShortDate } from "@/lib/dateOnly";
import { NewsletterPage } from "@/lib/newsletterPdf";
import type { StudentWeeklyReport } from "@/lib/weeklyReport";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 11, color: "#2D2A26" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6b6459", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#2C86AD" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletMark: { width: 12 },
  warn: { color: "#B67600" },
  good: { color: "#1F9187" },
});

function StudentReportPage({ report, weekLabel }: { report: StudentWeeklyReport; weekLabel: string }) {
  const present = report.totalDaysTracked - report.absences;
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>{report.name} — Weekly Report</Text>
      <Text style={styles.subtitle}>{weekLabel}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance</Text>
        <Text>
          {present} present / {report.absences} absent ({report.totalDaysTracked} days tracked)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Behavior</Text>
        <Text>
          {report.behaviorCounts.good} good, {report.behaviorCounts.bad} needs improvement
        </Text>
        {report.behaviorTags.map((t, i) => (
          <View style={styles.bullet} key={i}>
            <Text style={[styles.bulletMark, t.type === "good" ? styles.good : styles.warn]}>{"\u2022"}</Text>
            <Text>{t.tag}</Text>
          </View>
        ))}
      </View>

      {report.homework.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Homework</Text>
          {report.homework.map((h, i) => {
            const submitted = h.status === "handed_in" ? "Handed in" : "Missing";
            const grade = h.gradeScore !== null ? ` (score: ${h.gradeScore})` : h.gradeStatus ? ` (${h.gradeStatus})` : "";
            return (
              <View style={styles.row} key={i}>
                <Text>{h.assignment.name}</Text>
                <Text>
                  {submitted}
                  {grade}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {report.observations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes from this week</Text>
          {report.observations.map((o, i) => (
            <View style={styles.bullet} key={i}>
              <Text style={styles.bulletMark}>{"\u2022"}</Text>
              <Text>{o.note}</Text>
            </View>
          ))}
        </View>
      )}

      {report.praiseNotes.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.good]}>Great moments this week</Text>
          {report.praiseNotes.map((p, i) => (
            <View style={styles.bullet} key={i}>
              <Text style={[styles.bulletMark, styles.good]}>{"\u2022"}</Text>
              <Text>{p.note}</Text>
            </View>
          ))}
        </View>
      )}

      {report.missingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.warn]}>Still needed</Text>
          {report.missingEvents.map((e, i) => (
            <View style={styles.bullet} key={i}>
              <Text style={[styles.bulletMark, styles.warn]}>{"\u2022"}</Text>
              <Text>
                {e.name}: {e.what}
                {e.due ? ` (due ${formatShortDate(e.due)})` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

/**
 * One combined PDF per student: the classroom newsletter (if there's
 * anything in it) as the first page, then that student's own report as
 * the second - a single file to download and attach, rather than
 * juggling a separate newsletter PDF and a plain-text email body. Newsletter
 * page is entirely optional (omitted if there's nothing in the draft) so a
 * classroom that isn't using the newsletter feature still gets a clean
 * single-page report.
 */
export async function renderStudentReportPdf(args: {
  report: StudentWeeklyReport;
  weekLabel: string;
  newsletter?: {
    classroomName: string;
    bannerTitle?: string | null;
    bannerSubtitle?: string | null;
    blocks: Parameters<typeof NewsletterPage>[0]["blocks"];
    upcomingEvents: Parameters<typeof NewsletterPage>[0]["upcomingEvents"];
    thisWeekEvents: Parameters<typeof NewsletterPage>[0]["thisWeekEvents"];
    shortfalls: Parameters<typeof NewsletterPage>[0]["shortfalls"];
    upcomingSpellingWords: string[];
  } | null;
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {args.newsletter && args.newsletter.blocks.length > 0 && (
        <NewsletterPage
          classroomName={args.newsletter.classroomName}
          weekLabel={args.weekLabel}
          bannerTitle={args.newsletter.bannerTitle}
          bannerSubtitle={args.newsletter.bannerSubtitle}
          blocks={args.newsletter.blocks}
          upcomingEvents={args.newsletter.upcomingEvents}
          thisWeekEvents={args.newsletter.thisWeekEvents}
          shortfalls={args.newsletter.shortfalls}
          upcomingSpellingWords={args.newsletter.upcomingSpellingWords}
        />
      )}
      <StudentReportPage report={args.report} weekLabel={args.weekLabel} />
    </Document>
  );
}
