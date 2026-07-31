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
type PacingTodayUnit = {
  unit: { id: string; name: string };
  day: { id: string; date: string; topic: string | null; status: "not_started" | "completed" | "half_completed"; dayNumber: number };
};

const STATUS_LABEL: Record<PacingTodayUnit["day"]["status"], string> = {
  not_started: "Not Started",
  completed: "Completed",
  half_completed: "Half Completed",
};
const STATUS_COLOR: Record<PacingTodayUnit["day"]["status"], string> = {
  not_started: "#e2e8f0",
  completed: "#bbf7d0",
  half_completed: "#fde68a",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [pacing, setPacing] = useState<{ units: PacingTodayUnit[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadPacing() {
    fetch("/api/dashboard/pacing")
      .then((r) => r.json())
      .then(setPacing)
      .catch(() => setPacing({ units: [] }));
  }

  async function setTodayStatus(dayId: string, status: PacingTodayUnit["day"]["status"]) {
    // Optimistic update so the button feels instant - the PATCH below is the
    // same endpoint the Pacing Guide itself uses, so it stays perfectly in
    // sync (extra-day insertion on half_completed, etc. all still apply).
    setPacing((prev) =>
      prev
        ? {
            units: prev.units.map((u) =>
              u.day.id === dayId ? { ...u, day: { ...u.day, status } } : u
            ),
          }
        : prev
    );
    await fetch(`/api/pacing-units/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadPacing();
  }

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load dashboard"));

    fetch("/api/attendance/stats").then((r) => r.json()).then(setAttendanceStats);
    loadPacing();
  }, []);

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <p className="text-rose-600">
          ⚠️ Couldn't load the dashboard ({error}). This usually means a database migration
          hasn't run yet — check Railway's deploy logs, or try reloading in a moment.
        </p>
      </div>
    );
  }

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {data.birthdaysToday.length > 0 && (
        <div className="bg-pink-50 border border-pink-300 rounded p-4">
          <h2 className="font-bold">🎂 Birthday{data.birthdaysToday.length > 1 ? "s" : ""} Today!</h2>
          <p>{data.birthdaysToday.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}</p>
        </div>
      )}

      <ParentContactRotationWidget compact />

      <div className="card">
        <h3 className="font-semibold mb-2">Today's Pacing Guide</h3>
        {!pacing ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : pacing.units.length === 0 ? (
          <p className="text-sm text-gray-500">
            No unit is scheduled for today.{" "}
            <Link href="/pacing-guide" className="text-sky-600 hover:underline">
              Check the Pacing Guide →
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {pacing.units.map(({ unit, day }) => (
              <div key={day.id} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                <div>
                  <Link href={`/pacing-guide/${unit.id}`} className="font-medium text-sky-600 hover:underline">
                    {unit.name}
                  </Link>
                  {day.topic && <p className="text-sm text-slate-600">{day.topic}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {(["not_started", "half_completed", "completed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setTodayStatus(day.id, s)}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: day.status === s ? STATUS_COLOR[s] : "#f1f5f9",
                        fontWeight: day.status === s ? 600 : 400,
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          <h2 className="font-bold mb-2">Assignments — Marked Incomplete Today</h2>
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
            Go to Assignments →
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
    </div>
  );
}
