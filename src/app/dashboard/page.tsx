"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PieChart from "@/components/PieChart";
import ParentContactRotationWidget from "@/components/ParentContactRotationWidget";

type DashboardData = {
  absentToday: { student: { firstName: string; lastName: string } }[];
  birthdaysToday: { firstName: string; lastName: string }[];
  birthdaysThisWeek: { firstName: string; lastName: string }[];
  homeworkNeedsHelp: {
    student: { firstName: string; lastName: string };
    assignment: { name: string };
  }[];
  missingEvents: { student: { firstName: string; lastName: string }; event: { name: string } }[];
};
type AttendanceStats = {
  month: { present: number; absent: number };
  ytd: { present: number; absent: number };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load dashboard"));

    fetch("/api/attendance/stats").then((r) => r.json()).then(setAttendanceStats);
  }, []);

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-rose-600">
          ⚠️ Couldn't load the dashboard ({error}). This usually means a database migration
          hasn't run yet — check Railway's deploy logs, or try reloading in a moment.
        </p>
      </div>
    );
  }

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {data.birthdaysToday.length > 0 && (
        <div className="bg-pink-50 border border-pink-300 rounded p-4">
          <h2 className="font-bold">🎂 Birthday{data.birthdaysToday.length > 1 ? "s" : ""} Today!</h2>
          <p>{data.birthdaysToday.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}</p>
        </div>
      )}

      <ParentContactRotationWidget compact />

      {attendanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-sm mb-2">Attendance — This Month</h3>
            <PieChart
              size={100}
              slices={[
                { label: "Present", value: attendanceStats.month.present, color: "#a7f3d0" },
                { label: "Absent", value: attendanceStats.month.absent, color: "#fecaca" },
              ]}
            />
          </div>
          <div className="card">
            <h3 className="font-semibold text-sm mb-2">Attendance — Year to Date</h3>
            <PieChart
              size={100}
              slices={[
                { label: "Present", value: attendanceStats.ytd.present, color: "#a7f3d0" },
                { label: "Absent", value: attendanceStats.ytd.absent, color: "#fecaca" },
              ]}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-bold mb-2">Absent Today ({data.absentToday.length})</h2>
          {data.absentToday.length === 0 ? (
            <p className="text-gray-500 text-sm">Everyone's here!</p>
          ) : (
            <ul className="text-sm">
              {data.absentToday.map((a, i) => (
                <li key={i}>
                  {a.student.firstName} {a.student.lastName}
                </li>
              ))}
            </ul>
          )}
          <Link href="/roster" className="text-sky-600 text-sm hover:underline">
            Go to Roster & Attendance →
          </Link>
        </div>

        <div className="card">
          <h2 className="font-bold mb-2">🎂 Birthdays This Week</h2>
          {data.birthdaysThisWeek.length === 0 ? (
            <p className="text-gray-500 text-sm">None this week</p>
          ) : (
            <ul className="text-sm">
              {data.birthdaysThisWeek.map((s, i) => (
                <li key={i}>
                  {s.firstName} {s.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold mb-2">Homework — Needs Help Today</h2>
          {data.homeworkNeedsHelp.length === 0 ? (
            <p className="text-gray-500 text-sm">Nothing flagged</p>
          ) : (
            <ul className="text-sm">
              {data.homeworkNeedsHelp.map((h, i) => (
                <li key={i}>
                  {h.student.firstName} {h.student.lastName} — {h.assignment.name}
                </li>
              ))}
            </ul>
          )}
          <Link href="/homework" className="text-sky-600 text-sm hover:underline">
            Go to Homework →
          </Link>
        </div>

        <div className="card">
          <h2 className="font-bold mb-2">⚠️ Missing Event Slips</h2>
          {data.missingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">All caught up</p>
          ) : (
            <ul className="text-sm">
              {data.missingEvents.map((e, i) => (
                <li key={i}>
                  {e.student.firstName} {e.student.lastName} — {e.event.name}
                </li>
              ))}
            </ul>
          )}
          <Link href="/events" className="text-sky-600 text-sm hover:underline">
            Go to Events →
          </Link>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap pt-2">
        <Link href="/roster" className="btn-outline">
          Roster & Attendance
        </Link>
        <Link href="/behavior" className="btn-outline">
          Behavior Log
        </Link>
        <Link href="/groups" className="btn-outline">
          Group Builder
        </Link>
        <Link href="/reports" className="btn-outline">
          Weekly Report
        </Link>
        <Link href="/parent-log" className="btn-outline">
          Parent Log
        </Link>
        <Link href="/sub-mode" className="btn-outline">
          Sub Mode
        </Link>
      </div>
    </div>
  );
}
