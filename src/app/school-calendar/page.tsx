"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseDateOnly,
  toDateInputValue,
  addUtcDays,
  sundayOfUtc,
  formatShortDate,
  formatMonthYear,
} from "@/lib/dateOnly";

type EventType = "holiday" | "teacher_work_day" | "half_day" | "other";
type CalendarEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: EventType;
  isSchoolWide?: boolean;
};
type Classroom = {
  id: string;
  firstDayOfSchool: string | null;
  lastDayOfSchool: string | null;
};

const TYPE_LABEL: Record<EventType, string> = {
  holiday: "Holiday",
  teacher_work_day: "Teacher Work Day",
  half_day: "Half Day",
  other: "Reminder",
};
// The four colors the teacher asked for, plus a neutral for the default
// "Student Day" fill and a muted gray for weekends/out-of-range.
const STUDENT_DAY_COLOR = "#D9F2D0";
const TYPE_COLOR: Record<EventType, string> = {
  holiday: "#FBD1D1",
  teacher_work_day: "#FDE3B0",
  half_day: "#FFF3A3",
  other: "#BCD8EC",
};

function monthsBetween(start: Date, end: Date): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cur <= last) {
    months.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
}

// Priority when a date is covered by more than one entry: a full day off
// wins over a teacher work day, which wins over a half day. "other" never
// overrides the base color - it just adds a small dot marker.
function dominantType(date: Date, events: CalendarEvent[]): EventType | null {
  const covering = events.filter(
    (e) => date >= parseDateOnly(e.startDate) && date <= parseDateOnly(e.endDate)
  );
  if (covering.some((e) => e.type === "holiday")) return "holiday";
  if (covering.some((e) => e.type === "teacher_work_day")) return "teacher_work_day";
  if (covering.some((e) => e.type === "half_day")) return "half_day";
  return null;
}

function hasReminder(date: Date, events: CalendarEvent[]): boolean {
  return events.some(
    (e) => e.type === "other" && date >= parseDateOnly(e.startDate) && date <= parseDateOnly(e.endDate)
  );
}

function MonthGrid({
  year,
  month,
  firstDay,
  lastDay,
  events,
}: {
  year: number;
  month: number;
  firstDay: Date | null;
  lastDay: Date | null;
  events: CalendarEvent[];
}) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstCell = sundayOfUtc(firstOfMonth);
  const weeks: Date[][] = [];
  let cursor = new Date(firstCell);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor = addUtcDays(cursor, 1);
    }
    weeks.push(week);
    if (cursor.getUTCMonth() !== month && cursor > firstOfMonth) break;
  }

  return (
    <div className="border rounded p-3">
      <p className="font-semibold text-sm mb-2">{formatMonthYear(year, month)}</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <th key={d} className="p-1 text-slate-400 font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                const inMonth = day.getUTCMonth() === month && day.getUTCFullYear() === year;
                if (!inMonth) return <td key={di} className="p-1" />;
                const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                const inSchoolYear = firstDay && lastDay ? day >= firstDay && day <= lastDay : false;
                const type = dominantType(day, events);
                const reminder = hasReminder(day, events);
                let bg = "transparent";
                if (inSchoolYear && !isWeekend) {
                  bg = type ? TYPE_COLOR[type] : STUDENT_DAY_COLOR;
                }
                return (
                  <td
                    key={di}
                    className="p-1 text-center rounded relative"
                    style={{ backgroundColor: bg, color: "#1e293b" }}
                  >
                    {day.getUTCDate()}
                    {reminder && (
                      <span
                        className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: TYPE_COLOR.other }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SchoolCalendarPage() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [firstDayInput, setFirstDayInput] = useState("");
  const [lastDayInput, setLastDayInput] = useState("");
  const [savingBounds, setSavingBounds] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<EventType>("holiday");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClassroom();
    loadEvents();
  }, []);

  function loadClassroom() {
    fetch("/api/classroom")
      .then((r) => r.json())
      .then((c: Classroom | null) => {
        setClassroom(c);
        setFirstDayInput(c?.firstDayOfSchool ? toDateInputValue(c.firstDayOfSchool) : "");
        setLastDayInput(c?.lastDayOfSchool ? toDateInputValue(c.lastDayOfSchool) : "");
      });
  }

  function loadEvents() {
    fetch("/api/calendar-events").then((r) => r.json()).then(setEvents);
  }

  async function saveBounds() {
    setSavingBounds(true);
    await fetch("/api/classroom", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstDayOfSchool: firstDayInput || null,
        lastDayOfSchool: lastDayInput || null,
      }),
    });
    setSavingBounds(false);
    loadClassroom();
  }

  async function addEvent() {
    if (!name.trim() || !startDate) return;
    setSaving(true);
    await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), startDate, endDate: endDate || startDate, type }),
    });
    setName("");
    setStartDate("");
    setEndDate("");
    setSaving(false);
    loadEvents();
  }

  function downloadTemplate() {
    const csv = [
      "name,startDate,endDate,type",
      "Winter Break,2026-12-21,2027-01-02,holiday",
      "Teacher Grading Day,2026-10-09,2026-10-09,teacher_work_day",
      "Early Release,2026-11-25,2026-11-25,half_day",
      "Picture Day,2026-09-15,2026-09-15,other",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "school-calendar-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const res = await fetch("/api/calendar-events/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: text }),
    });
    const result = await res.json().catch(() => ({}));
    setImporting(false);
    if (res.ok) {
      alert(
        `Imported ${result.imported ?? 0} entr${result.imported === 1 ? "y" : "ies"}.` +
          (result.skipped ? ` Skipped ${result.skipped} row(s) missing a name or date.` : "")
      );
      loadEvents();
    } else {
      alert(result.error || "Import failed. Check the file matches the template format.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removeEvent(id: string, eventName: string) {
    if (!confirm(`Remove "${eventName}"?`)) return;
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    loadEvents();
  }

  const firstDay = classroom?.firstDayOfSchool ? parseDateOnly(classroom.firstDayOfSchool) : null;
  const lastDay = classroom?.lastDayOfSchool ? parseDateOnly(classroom.lastDayOfSchool) : null;
  const months = useMemo(() => {
    if (!firstDay || !lastDay) return [];
    return monthsBetween(firstDay, lastDay);
  }, [firstDay, lastDay]);

  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">School Calendar</h1>
      <p className="text-sm text-slate-500 mb-6">
        Set the first and last day of school, then layer holidays, teacher work days, and half
        days on top - everything else in between is automatically a regular student day. This
        feeds the Pacing Guide: teacher work days and holidays are skipped entirely when
        scheduling unit days, half days still count but get flagged, and any unit whose range
        overlaps one of these shows it under "Dates to Remember".
      </p>

      <div className="panel mb-6 space-y-2">
        <h2 className="font-semibold text-sm">School Year</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500">First day of school</label>
            <input
              type="date"
              value={firstDayInput}
              onChange={(e) => setFirstDayInput(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Last day of school</label>
            <input
              type="date"
              value={lastDayInput}
              onChange={(e) => setLastDayInput(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <button onClick={saveBounds} disabled={savingBounds} className="btn-primary">
            {savingBounds ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="panel mb-6 bg-slate-50 border-slate-200">
        <p className="text-sm text-slate-600">
          Holidays, teacher work days, and half days are set by your principal for the whole
          school - you&apos;ll see everything they add below, but only they can add or remove
          entries.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-xs items-center">
        <span className="font-semibold">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: STUDENT_DAY_COLOR }} />
          Student Day
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: TYPE_COLOR.teacher_work_day }} />
          Teacher Work Day
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: TYPE_COLOR.half_day }} />
          Half Day
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: TYPE_COLOR.holiday }} />
          Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: TYPE_COLOR.other }} />
          Reminder (dot)
        </span>
      </div>

      {!firstDay || !lastDay ? (
        <p className="text-slate-500 mb-6">
          Set the first and last day of school above to see the year laid out here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              firstDay={firstDay}
              lastDay={lastDay}
              events={events}
            />
          ))}
        </div>
      )}

      <h2 className="font-semibold text-sm mb-2">All Entries</h2>
      <div className="space-y-1">
        {sorted.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between rounded px-3 py-2 text-sm"
            style={{ backgroundColor: `${TYPE_COLOR[ev.type]}88` }}
          >
            <span>
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: TYPE_COLOR[ev.type] }}
              >
                {TYPE_LABEL[ev.type]}
              </span>
              {ev.isSchoolWide && (
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2 bg-slate-700 text-white">
                  School-wide
                </span>
              )}
              {ev.name} — {formatShortDate(ev.startDate)}
              {toDateInputValue(ev.endDate) !== toDateInputValue(ev.startDate) &&
                ` to ${formatShortDate(ev.endDate)}`}
            </span>
            {ev.isSchoolWide ? (
              <span className="text-xs text-slate-500" title="Set by your principal - only they can change it">
                Set by principal
              </span>
            ) : (
              <button
                onClick={() => removeEvent(ev.id, ev.name)}
                className="text-rose-600 text-xs hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-slate-500">No entries yet - add your first one above.</p>
        )}
      </div>
    </div>
  );
}
