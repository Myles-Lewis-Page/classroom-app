"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/dateOnly";

type StudentReport = {
  studentId: string;
  name: string;
  parentEmail: string | null;
  absences: number;
  totalDaysTracked: number;
  behaviorCounts: { good: number; bad: number };
  behaviorTags: { type: "good" | "bad"; tag: string }[];
  homework: {
    assignment: { name: string };
    status: string;
    gradeStatus: string | null;
    gradeScore: number | null;
  }[];
  observations: { note: string }[];
  praiseNotes: { note: string }[];
  missingEvents: { name: string; due: string | null; what: string }[];
};
type ChaperoneShortfall = { name: string; date: string; needed: number; confirmed: number };

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyReportPage() {
  const [start, setStart] = useState(() => mondayOf(new Date()));
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [chaperoneShortfalls, setChaperoneShortfalls] = useState<ChaperoneShortfall[]>([]);
  const [newsletterContent, setNewsletterContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 4); // Mon-Fri
    const res = await fetch(
      `/api/reports/weekly?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    const data = await res.json();
    setReports(data.reports);
    setChaperoneShortfalls(data.chaperoneShortfalls ?? []);
    setNewsletterContent(data.newsletterContent ?? "");
    setLoading(false);
  }

  function emailStudent(r: StudentReport) {
    if (!r.parentEmail) {
      alert(`No parent email on file for ${r.name}`);
      return;
    }
    const subject = encodeURIComponent(`${r.name} — Weekly Report`);
    const body = encodeURIComponent(buildEmailBody(r));
    window.location.href = `mailto:${r.parentEmail}?subject=${subject}&body=${body}`;
  }

  function buildEmailBody(r: StudentReport): string {
    const lines: string[] = [];
    if (newsletterContent.trim()) {
      lines.push(newsletterContent.trim(), "", "――――――――――――――――――――", "");
    }
    lines.push(
      `Weekly Report for ${r.name}`,
      "",
      `Attendance: ${r.totalDaysTracked - r.absences} present / ${r.absences} absent`,
      "",
      `Behavior this week: ${r.behaviorCounts.good} good, ${r.behaviorCounts.bad} needs improvement`
    );
    if (r.behaviorTags.length) {
      lines.push("", "Behavior notes:");
      r.behaviorTags.forEach((t) => lines.push(`- ${t.type === "good" ? "👍" : "⚠️"} ${t.tag}`));
    }
    if (r.homework.length) {
      lines.push("", "Homework:");
      r.homework.forEach((h) => {
        const submitted = h.status === "handed_in" ? "Handed in" : "Missing";
        const grade =
          h.gradeScore !== null
            ? ` (score: ${h.gradeScore})`
            : h.gradeStatus
            ? ` (${h.gradeStatus})`
            : "";
        lines.push(`- ${h.assignment.name}: ${submitted}${grade}`);
      });
    }
    if (r.observations.length) {
      lines.push("", "Notes from this week:");
      r.observations.forEach((o) => lines.push(`- ${o.note}`));
    }
    if (r.praiseNotes.length) {
      lines.push("", "🌟 Great moments this week:");
      r.praiseNotes.forEach((p) => lines.push(`- ${p.note}`));
    }
    if (r.missingEvents.length) {
      lines.push("", "⚠️ Still needed:");
      r.missingEvents.forEach((e) =>
        lines.push(`- ${e.name}: ${e.what}${e.due ? ` (due ${formatShortDate(e.due)})` : ""}`)
      );
    }
    return lines.join("\n");
  }

  function chaperoneNoteText(): string {
    if (chaperoneShortfalls.length === 0) return "";
    const lines = ["🙋 We still need more chaperones:"];
    chaperoneShortfalls.forEach((s) =>
      lines.push(
        `- ${s.name} (${formatShortDate(s.date)}): ${s.confirmed} of ${s.needed} confirmed - please let me know if you can help!`
      )
    );
    return lines.join("\n");
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Weekly Report Export</h1>

      <div className="flex gap-3 items-end mb-6">
        <div>
          <label className="block text-sm mb-1">Week of (Monday)</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button onClick={generate} className="btn-primary px-4 py-2">
          {loading ? "Generating..." : "Generate All Weekly Reports"}
        </button>
      </div>

      {newsletterContent.trim() && (
        <div className="border rounded p-4 mb-4 bg-slate-50">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-semibold text-sm">Newsletter (goes at the top of every email)</h2>
            <a href="/newsletter" className="text-sky-600 text-xs hover:underline">
              Edit →
            </a>
          </div>
          <pre className="text-xs whitespace-pre-wrap">{newsletterContent}</pre>
        </div>
      )}

      {chaperoneShortfalls.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded p-4 mb-6">
          <h2 className="font-bold text-amber-800 mb-1">🙋 Still need more chaperones</h2>
          <p className="text-sm text-slate-500 mb-2">
            Include this at the top of the newsletter - it's classroom-wide, not tied to any one
            student.
          </p>
          <ul className="text-sm space-y-1">
            {chaperoneShortfalls.map((s) => (
              <li key={s.name}>
                {s.name} ({formatShortDate(s.date)}): {s.confirmed} of {s.needed} confirmed
              </li>
            ))}
          </ul>
          <pre className="text-xs bg-white border rounded p-2 mt-2 whitespace-pre-wrap">{chaperoneNoteText()}</pre>
        </div>
      )}

      {reports.map((r) => (
        <div key={r.studentId} className="border rounded p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold">{r.name}</h3>
              <p className="text-sm text-gray-600">
                Attendance: {r.totalDaysTracked - r.absences} present / {r.absences} absent
                {"  ·  "}
                Behavior: {r.behaviorCounts.good}🙂 {r.behaviorCounts.bad}🙁
              </p>
              {r.missingEvents.length > 0 && (
                <p className="text-sm text-rose-600">
                  ⚠️ Still needed:{" "}
                  {r.missingEvents
                    .map((e) => `${e.name} (${e.what})${e.due ? ` due ${formatShortDate(e.due)}` : ""}`)
                    .join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={() => emailStudent(r)}
              className="btn-success whitespace-nowrap"
            >
              Email Parent
            </button>
          </div>
        </div>
      ))}

      {reports.length === 0 && !loading && (
        <p className="text-gray-500">Pick a week and click "Generate All Weekly Reports" to preview.</p>
      )}
    </div>
  );
}
