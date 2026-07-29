"use client";

import { useEffect, useState } from "react";
import { formatShortDate, toDateInputValue } from "@/lib/dateOnly";

type CalendarEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: "holiday" | "half_day" | "other";
};

const TYPE_LABEL: Record<string, string> = {
  holiday: "Day Off",
  half_day: "Half Day",
  other: "Reminder",
};
const TYPE_COLOR: Record<string, string> = {
  holiday: "#FFCBE1",
  half_day: "#F9E1A8",
  other: "#BCD8EC",
};

export default function SchoolCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"holiday" | "half_day" | "other">("holiday");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/calendar-events").then((r) => r.json()).then(setEvents);
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
    load();
  }

  async function removeEvent(id: string, eventName: string) {
    if (!confirm(`Remove "${eventName}"?`)) return;
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    load();
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">School Calendar</h1>
      <p className="text-sm text-slate-500 mb-6">
        Days off, half days, and other dates to remember for the school year. This feeds the
        Pacing Guide automatically - any unit whose date range overlaps one of these shows it
        under "Dates to Remember", and days off / half days gray out in that unit's week tables.
      </p>

      <div className="panel mb-6 space-y-2">
        <h2 className="font-semibold text-sm">Add an entry</h2>
        <input
          placeholder="Name (e.g. Winter Break, Picture Day, Early Release)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">End date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="border rounded px-2 py-1"
            >
              <option value="holiday">Day Off (no school)</option>
              <option value="half_day">Half Day</option>
              <option value="other">Reminder only (doesn't affect pacing)</option>
            </select>
          </div>
          <button onClick={addEvent} disabled={saving} className="btn-primary">
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          "Day Off" is skipped entirely when the Pacing Guide schedules lesson days. "Half Day"
          still counts as an instructional day, just flagged. "Reminder only" doesn't change
          pacing at all - it's just something to remember.
        </p>
      </div>

      <div className="space-y-1">
        {sorted.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between rounded px-3 py-2 text-sm"
            style={{ backgroundColor: `${TYPE_COLOR[ev.type]}66` }}
          >
            <span>
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: TYPE_COLOR[ev.type] }}
              >
                {TYPE_LABEL[ev.type]}
              </span>
              {ev.name} —{" "}
              {formatShortDate(ev.startDate)}
              {toDateInputValue(ev.endDate) !== toDateInputValue(ev.startDate) &&
                ` to ${formatShortDate(ev.endDate)}`}
            </span>
            <button
              onClick={() => removeEvent(ev.id, ev.name)}
              className="text-rose-600 text-xs hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-slate-500">No calendar entries yet - add your first one above.</p>
        )}
      </div>
    </div>
  );
}
