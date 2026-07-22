"use client";

import { useState } from "react";

type StudentReport = {
  studentId: string;
  name: string;
  parentEmail: string | null;
  absences: number;
  totalDaysTracked: number;
  ratingCounts: { green: number; yellow: number; red: number };
  behaviorComments: { subject: string; comment: string | null }[];
  homework: { assignment: { name: string }; status: string }[];
  observations: { note: string }[];
  praiseNotes: { note: string }[];
  missingEvents: string[];
};

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
    const lines = [
      `Weekly Report for ${r.name}`,
      "",
      `Attendance: ${r.totalDaysTracked - r.absences} present / ${r.absences} absent`,
      "",
      `Behavior this week: ${r.ratingCounts.green} green, ${r.ratingCounts.yellow} yellow, ${r.ratingCounts.red} red days`,
    ];
    if (r.behaviorComments.length) {
      lines.push("", "Behavior notes:");
      r.behaviorComments.forEach((c) => lines.push(`- ${c.subject}: ${c.comment}`));
    }
    if (r.homework.length) {
      lines.push("", "Homework:");
      r.homework.forEach((h) => lines.push(`- ${h.assignment.name}: ${h.status}`));
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
      r.missingEvents.forEach((e) => lines.push(`- ${e} slip/payment`));
    }
    return lines.join("\n");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

      {reports.map((r) => (
        <div key={r.studentId} className="border rounded p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold">{r.name}</h3>
              <p className="text-sm text-gray-600">
                Attendance: {r.totalDaysTracked - r.absences} present / {r.absences} absent
                {"  ·  "}
                Behavior: {r.ratingCounts.green}🟢 {r.ratingCounts.yellow}🟡 {r.ratingCounts.red}🔴
              </p>
              {r.missingEvents.length > 0 && (
                <p className="text-sm text-rose-600">
                  ⚠️ Still needed: {r.missingEvents.join(", ")}
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
