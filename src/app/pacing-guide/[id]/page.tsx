"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { UNIT_COLORS } from "@/lib/unitColors";
import {
  parseDateOnly,
  toDateInputValue,
  addUtcDays,
  isWeekend,
  mondayOfUtc,
  sundayOfUtc,
  formatShortWeekday,
  formatShortDate,
  formatMonthYear,
  rangesOverlap,
} from "@/lib/dateOnly";

type DayStatus = "not_started" | "completed" | "half_completed";
type Day = {
  id: string;
  dayNumber: number;
  date: string;
  topicId: string | null;
  topic: string | null;
  learningTarget: string | null;
  standards: string | null;
  supports: string | null;
  lessonActivities: string | null;
  warmUp: string | null;
  materialsNeeded: string | null;
  status: DayStatus;
  isExtraDay: boolean;
};
type UnitSummative = { id: string; title: string; date: string };
type UnitTopic = {
  id: string;
  name: string;
  days: number;
  learningTarget: string | null;
  standards: string | null;
  support: string | null;
};
type Unit = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standards: string | null;
  days: Day[];
  unitSummatives: UnitSummative[];
  unitTopics: UnitTopic[];
};
type CalEvent = { id: string; name: string; startDate: string; endDate: string; type: string };

// How many instructional (non-weekend, non-holiday/teacher-work-day) dates
// fall between start and end, inclusive - i.e. what the unit's day count
// would have been from its originally-set start/end dates alone, before any
// topic overflow or half-completed insertions extended it further.
function countInstructionalDays(start: Date, end: Date, holidayEvents: CalEvent[]): number {
  let count = 0;
  let cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      const onHoliday = holidayEvents.some(
        (h) => cursor >= parseDateOnly(h.startDate) && cursor <= parseDateOnly(h.endDate)
      );
      if (!onHoliday) count++;
    }
    cursor = addUtcDays(cursor, 1);
  }
  return count;
}

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

function MiniCalendar({
  year,
  month,
  startDate,
  endDate,
  color,
  holidayEvents,
}: {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  color: string;
  holidayEvents: CalEvent[];
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

  const monthLabel = formatMonthYear(year, month);

  function isHoliday(d: Date) {
    return holidayEvents.some(
      (h) => d >= parseDateOnly(h.startDate) && d <= parseDateOnly(h.endDate)
    );
  }

  return (
    <div className="border rounded p-3">
      <p className="font-semibold text-sm mb-2">{monthLabel}</p>
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
                const inRange = day >= startDate && day <= endDate;
                const holiday = inRange && isHoliday(day);
                return (
                  <td
                    key={di}
                    className="p-1 text-center rounded"
                    style={{
                      backgroundColor: holiday ? "#e2e8f0" : inRange ? color : "transparent",
                      color: "#1e293b",
                    }}
                  >
                    {day.getUTCDate()}
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

function SummativeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (title: string, date: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3">
        <h3 className="font-semibold">Add Summative</h3>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Band Field Trip"
            className="border rounded px-2 py-1 w-full"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline text-sm">
            Cancel
          </button>
          <button
            onClick={() => title.trim() && date && onSave(title.trim(), date)}
            className="btn-primary text-sm"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function TopicModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (t: { name: string; days: number; learningTarget: string; standards: string; support: string }) => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("1");
  const [learningTarget, setLearningTarget] = useState("");
  const [standards, setStandards] = useState("");
  const [support, setSupport] = useState("");

  function submit() {
    const n = Number(days);
    if (!name.trim() || !Number.isFinite(n) || n < 1) return;
    onSave({ name: name.trim(), days: n, learningTarget, standards, support });
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3">
        <h3 className="font-semibold">Add Topic</h3>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Topic</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fractions"
            className="border rounded px-2 py-1 w-full"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">How many days</label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Learning Target</label>
          <textarea
            value={learningTarget}
            onChange={(e) => setLearningTarget(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Standards</label>
          <input
            value={standards}
            onChange={(e) => setStandards(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Support</label>
          <input
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <p className="text-xs text-slate-400">
          This will fill the next {days || "?"} instructional day(s) in the schedule below,
          continuing right after your last topic.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline text-sm">
            Cancel
          </button>
          <button onClick={submit} className="btn-primary text-sm">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<DayStatus, string> = {
  not_started: "Not Started",
  completed: "Completed",
  half_completed: "Half Completed",
};
const STATUS_COLOR: Record<DayStatus, string> = {
  not_started: "#f1f5f9",
  completed: "#bbf7d0",
  half_completed: "#fde68a",
};

type Row =
  | { kind: "day"; date: Date; day: Day; halfDayLabel: string | null }
  | { kind: "off"; date: Date; label: string; eventType: string };

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const [showSummativeModal, setShowSummativeModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [overDaysNotice, setOverDaysNotice] = useState<number | null>(null);

  useEffect(() => {
    load();
    fetch("/api/calendar-events").then((r) => r.json()).then(setCalendarEvents);
    fetch("/api/pacing-units")
      .then((r) => r.json())
      .then((units: { id: string }[]) => {
        const idx = units.findIndex((u) => u.id === id);
        setColorIndex(idx >= 0 ? idx : 0);
      });
  }, [id]);

  function load() {
    fetch(`/api/pacing-units/${id}`)
      .then((r) => r.json())
      .then((u: Unit) => setUnit(u));
  }

  async function saveDayField(dayId: string, field: string, value: string) {
    await fetch(`/api/pacing-units/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function setDayStatus(dayId: string, status: DayStatus) {
    await fetch(`/api/pacing-units/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeExtraDay(dayId: string) {
    if (!confirm("Remove this extra day? Only do this if it ended up unused.")) return;
    await fetch(`/api/pacing-units/days/${dayId}`, { method: "DELETE" });
    load();
  }

  async function addSummative(title: string, date: string) {
    await fetch(`/api/pacing-units/${id}/summatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date }),
    });
    setShowSummativeModal(false);
    load();
  }

  async function removeSummative(summativeId: string) {
    await fetch(`/api/pacing-units/summatives/${summativeId}`, { method: "DELETE" });
    load();
  }

  async function addTopic(t: { name: string; days: number; learningTarget: string; standards: string; support: string }) {
    const priorTotalDays = unit?.days.length ?? 0;
    const priorTopicDaysSum = unit?.unitTopics.reduce((sum, x) => sum + x.days, 0) ?? 0;
    const overBy = priorTopicDaysSum + t.days - priorTotalDays;

    await fetch(`/api/pacing-units/${id}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
    setShowTopicModal(false);
    load();

    if (overBy > 0) setOverDaysNotice(overBy);
  }

  async function removeTopic(topicId: string) {
    if (!confirm("Remove this topic? The days it filled in will be cleared (not deleted).")) return;
    await fetch(`/api/pacing-units/topics/${topicId}`, { method: "DELETE" });
    load();
  }

  // Regenerates this unit's day rows from scratch, from its own set start/end
  // dates, then reapplies topics - the same thing editing the dates does,
  // just re-triggered with the dates unchanged. Mainly a self-heal button
  // for a unit that ended up with a stale day count from testing/edits made
  // before some of the automatic day-count fixes existed.
  async function recalculateDays() {
    if (!unit) return;
    if (
      !confirm(
        "Regenerate this unit's schedule from its set start/end dates? Topics will be reapplied, but any manually-typed content on days that no longer fit will be lost."
      )
    )
      return;
    const res = await fetch(`/api/pacing-units/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: toDateInputValue(unit.startDate),
        endDate: toDateInputValue(unit.endDate),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Couldn't recalculate this unit's days.");
      return;
    }
    load();
  }

  const holidayEvents = useMemo(
    () => calendarEvents.filter((e) => e.type === "holiday" || e.type === "teacher_work_day"),
    [calendarEvents]
  );
  const halfDayEvents = useMemo(() => calendarEvents.filter((e) => e.type === "half_day"), [calendarEvents]);

  const rows: Row[] = useMemo(() => {
    if (!unit || unit.days.length === 0) return [];
    const sorted = [...unit.days].sort((a, b) => a.dayNumber - b.dayNumber);
    const firstDate = parseDateOnly(sorted[0].date);
    const lastDate = parseDateOnly(sorted[sorted.length - 1].date);
    const byDate = new Map(sorted.map((d) => [toDateInputValue(d.date), d]));
    const out: Row[] = [];
    let cursor = new Date(firstDate);
    while (cursor <= lastDate) {
      if (!isWeekend(cursor)) {
        const key = toDateInputValue(cursor);
        const match = byDate.get(key);
        if (match) {
          const half = halfDayEvents.find(
            (h) => cursor >= parseDateOnly(h.startDate) && cursor <= parseDateOnly(h.endDate)
          );
          out.push({ kind: "day", date: new Date(cursor), day: match, halfDayLabel: half?.name ?? null });
        } else {
          const off = holidayEvents.find(
            (h) => cursor >= parseDateOnly(h.startDate) && cursor <= parseDateOnly(h.endDate)
          );
          if (off) out.push({ kind: "off", date: new Date(cursor), label: off.name, eventType: off.type });
        }
      }
      cursor = addUtcDays(cursor, 1);
    }
    return out;
  }, [unit, holidayEvents, halfDayEvents]);

  const weeks = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((row) => {
      const key = toDateInputValue(mondayOfUtc(row.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [rows]);

  if (!unit) return <div className="p-6">Loading...</div>;

  const color = UNIT_COLORS[colorIndex % UNIT_COLORS.length];
  const startDate = parseDateOnly(unit.startDate);
  const sortedDays = [...unit.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const lastDayDate =
    sortedDays.length > 0 ? parseDateOnly(sortedDays[sortedDays.length - 1].date) : parseDateOnly(unit.endDate);
  const months = monthsBetween(startDate, lastDayDate);

  const datesToRemember = calendarEvents
    .filter((e) => rangesOverlap(startDate, lastDayDate, parseDateOnly(e.startDate), parseDateOnly(e.endDate)))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const totalDays = unit.days.length;
  const completedDays = unit.days.filter((d) => d.status === "completed" || d.status === "half_completed").length;
  const topicDaysSum = unit.unitTopics.reduce((sum, t) => sum + t.days, 0);
  const topicDaysPlanned = Math.min(topicDaysSum, totalDays);
  const originalPlannedDays = countInstructionalDays(startDate, parseDateOnly(unit.endDate), holidayEvents);
  const extraDays = Math.max(0, totalDays - originalPlannedDays);
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = parseDateOnly(todayStr);
  const expectedByToday = unit.days.filter((d) => parseDateOnly(d.date) <= today).length;
  let paceMessage = "";
  if (totalDays > 0) {
    if (completedDays < expectedByToday - 1) {
      paceMessage = "A bit behind - might be worth trimming a topic down.";
    } else if (completedDays > expectedByToday + 1) {
      paceMessage = "Ahead of schedule - room to slow down if needed.";
    } else {
      paceMessage = "Right on pace.";
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link href="/pacing-guide" className="text-sky-600 text-sm hover:underline">
        ← Back to Pacing Guide
      </Link>

      <div className="rounded-lg p-4 sm:p-6 my-4" style={{ backgroundColor: color }}>
        <div className="flex justify-between items-start gap-2 mb-3">
          <h1 className="text-2xl font-bold">{unit.name} - Lesson Plans</h1>
          <button
            onClick={recalculateDays}
            className="text-xs text-slate-600 hover:underline shrink-0 mt-1"
            title="Regenerate this unit's days from its set start/end dates and reapply topics"
          >
            Recalculate Days
          </button>
        </div>
        <div className="flex gap-6 flex-wrap text-sm">
          <div>
            <span className="text-slate-600">Unit Start</span>
            <p className="font-semibold">{formatShortDate(startDate)}</p>
          </div>
          <div>
            <span className="text-slate-600">Unit End</span>
            <p className="font-semibold">{formatShortDate(unit.endDate)}</p>
            {toDateInputValue(lastDayDate) !== toDateInputValue(unit.endDate) && (
              <p className="text-xs text-amber-600">Actually ends {formatShortDate(lastDayDate)}</p>
            )}
          </div>
          <div>
            <span className="text-slate-600">Days in Unit</span>
            <p className="font-semibold">{totalDays}</p>
            {extraDays > 0 && (
              <p className="text-xs text-amber-600">+{extraDays} extra day{extraDays === 1 ? "" : "s"} added</p>
            )}
          </div>
          <div>
            <span className="text-slate-600">Topic Days</span>
            <p className="font-semibold">
              {topicDaysPlanned} of {totalDays} planned
            </p>
            {topicDaysSum > totalDays && (
              <p className="text-xs text-amber-600">
                {topicDaysSum - totalDays} day{topicDaysSum - totalDays === 1 ? "" : "s"} over
              </p>
            )}
          </div>
          <div>
            <span className="text-slate-600">Pacing</span>
            <p className="font-semibold">
              {completedDays} of {totalDays} days used
            </p>
            {paceMessage && <p className="text-xs text-slate-600">{paceMessage}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col gap-4">
          {months.map((m) => (
            <MiniCalendar
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              startDate={startDate}
              endDate={lastDayDate}
              color={color}
              holidayEvents={holidayEvents}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-sm">Summatives</p>
              <button onClick={() => setShowSummativeModal(true)} className="btn-outline text-xs">
                + Add
              </button>
            </div>
            {unit.unitSummatives.length === 0 ? (
              <p className="text-xs text-slate-400">None yet.</p>
            ) : (
              <ul className="space-y-1">
                {unit.unitSummatives.map((s) => (
                  <li key={s.id} className="flex justify-between items-center text-sm border-b py-1">
                    <span>
                      {formatShortDate(s.date)}: {s.title}
                    </span>
                    <button
                      onClick={() => removeSummative(s.id)}
                      className="text-rose-600 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <p className="font-semibold text-sm mb-2">Dates to Remember</p>
            {datesToRemember.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nothing on the{" "}
                <Link href="/school-calendar" className="underline text-sky-600">
                  school calendar
                </Link>{" "}
                falls in this unit's range.
              </p>
            ) : (
              <ul className="text-sm space-y-1">
                {datesToRemember.map((e) => (
                  <li key={e.id}>
                    {formatShortDate(e.startDate)}
                    {toDateInputValue(e.endDate) !== toDateInputValue(e.startDate) &&
                      ` - ${formatShortDate(e.endDate)}`}
                    : {e.name}
                    {e.type === "holiday" && <span className="text-xs text-slate-400"> (day off)</span>}
                    {e.type === "teacher_work_day" && (
                      <span className="text-xs text-slate-400"> (teacher work day)</span>
                    )}
                    {e.type === "half_day" && <span className="text-xs text-slate-400"> (half day)</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/school-calendar" className="text-xs text-sky-600 hover:underline block mt-2">
              Manage school calendar →
            </Link>
          </div>
        </div>
      </div>

      <div className="panel mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-sm">Topics</p>
          <button onClick={() => setShowTopicModal(true)} className="btn-outline text-xs">
            + Add Topic
          </button>
        </div>
        {unit.unitTopics.length === 0 ? (
          <p className="text-xs text-slate-400">
            None yet - add one to auto-fill the schedule below starting at Day 1.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {unit.unitTopics.map((t) => (
              <li key={t.id} className="border-b pb-2 flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium">
                    {t.name} <span className="text-slate-400 font-normal">· {t.days} day(s)</span>
                  </p>
                  {t.learningTarget && <p className="text-xs text-slate-500">Target: {t.learningTarget}</p>}
                  {t.standards && <p className="text-xs text-slate-500">Standards: {t.standards}</p>}
                  {t.support && <p className="text-xs text-slate-500">Support: {t.support}</p>}
                </div>
                <button
                  onClick={() => removeTopic(t.id)}
                  className="text-rose-600 text-xs hover:underline shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unit.standards && (
        <div className="panel mb-6 text-sm">
          <p>Standards: {unit.standards}</p>
        </div>
      )}

      {weeks.map(([weekKey, weekRows], wi) => (
        <div key={weekKey} className="mb-6 overflow-x-auto">
          <div className="rounded px-3 py-1 font-semibold text-sm mb-1" style={{ backgroundColor: color }}>
            Week {wi + 1}
          </div>
          <table className="border-collapse text-xs w-full">
            <thead>
              <tr className="text-left" style={{ backgroundColor: `${color}55` }}>
                <th className="border p-1">Date</th>
                <th className="border p-1">Topic</th>
                <th className="border p-1">Learning Target</th>
                <th className="border p-1">Standards</th>
                <th className="border p-1">Supports</th>
                <th className="border p-1">Warm Up</th>
                <th className="border p-1">Lesson/Activities</th>
                <th className="border p-1">Materials Needed</th>
                <th className="border p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {weekRows.map((row) =>
                row.kind === "off" ? (
                  <tr key={row.date.toISOString()} className="bg-slate-200">
                    <td className="border p-1 whitespace-nowrap font-medium">
                      {formatShortWeekday(row.date)}
                    </td>
                    <td className="border p-1 text-slate-500 italic" colSpan={8}>
                      {row.label} {row.eventType === "teacher_work_day" ? "(no students)" : "(no school)"}
                    </td>
                  </tr>
                ) : (
                  <DayRow
                    key={row.day.id}
                    day={row.day}
                    halfDayLabel={row.halfDayLabel}
                    onSaveField={saveDayField}
                    onSetStatus={setDayStatus}
                    onRemoveExtraDay={removeExtraDay}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      ))}

      {showSummativeModal && (
        <SummativeModal onClose={() => setShowSummativeModal(false)} onSave={addSummative} />
      )}
      {showTopicModal && <TopicModal onClose={() => setShowTopicModal(false)} onSave={addTopic} />}
      {overDaysNotice !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3 text-center">
            <p className="font-semibold text-amber-700">
              Over by {overDaysNotice} day{overDaysNotice === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-slate-600">
              That topic pushes the unit past its originally-set length. Extra day(s) were added
              automatically at the end of the schedule so nothing was lost - just know the unit
              now runs longer than planned.
            </p>
            <button onClick={() => setOverDaysNotice(null)} className="btn-primary text-sm">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  halfDayLabel,
  onSaveField,
  onSetStatus,
  onRemoveExtraDay,
}: {
  day: Day;
  halfDayLabel: string | null;
  onSaveField: (dayId: string, field: string, value: string) => void;
  onSetStatus: (dayId: string, status: DayStatus) => void;
  onRemoveExtraDay: (dayId: string) => void;
}) {
  const [fields, setFields] = useState({
    topic: day.topic ?? "",
    learningTarget: day.learningTarget ?? "",
    standards: day.standards ?? "",
    supports: day.supports ?? "",
    warmUp: day.warmUp ?? "",
    lessonActivities: day.lessonActivities ?? "",
    materialsNeeded: day.materialsNeeded ?? "",
  });

  // DayRow instances are reused across reloads (keyed by the stable day.id),
  // so useState's initial value alone only captures whatever the day looked
  // like the very first time this row mounted. Without this, adding a Topic
  // (which fills topic/learningTarget/standards/supports on the server) or
  // any other change made elsewhere never shows up in these inputs until a
  // full page refresh forces a remount. Re-sync whenever the server's own
  // values for this day actually change.
  useEffect(() => {
    setFields({
      topic: day.topic ?? "",
      learningTarget: day.learningTarget ?? "",
      standards: day.standards ?? "",
      supports: day.supports ?? "",
      warmUp: day.warmUp ?? "",
      lessonActivities: day.lessonActivities ?? "",
      materialsNeeded: day.materialsNeeded ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    day.id,
    day.topic,
    day.learningTarget,
    day.standards,
    day.supports,
    day.warmUp,
    day.lessonActivities,
    day.materialsNeeded,
  ]);

  function update(field: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  function blur(field: keyof typeof fields) {
    onSaveField(day.id, field, fields[field]);
  }

  const cellClass = "border p-1";
  const inputClass = "w-full text-xs border-none focus:outline-none focus:bg-sky-50 bg-transparent";
  const rowStyle = halfDayLabel ? { backgroundColor: "#f1f5f9" } : undefined;

  return (
    <tr style={rowStyle}>
      <td className={`${cellClass} whitespace-nowrap font-medium`}>
        {formatShortWeekday(day.date)}
        {halfDayLabel && <span className="block text-[10px] text-slate-500">Half Day - {halfDayLabel}</span>}
        {day.isExtraDay && (
          <button
            onClick={() => onRemoveExtraDay(day.id)}
            className="block text-[10px] text-rose-500 hover:underline"
            title="Remove this auto-inserted extra day"
          >
            (extra day - remove)
          </button>
        )}
      </td>
      {(
        [
          "topic",
          "learningTarget",
          "standards",
          "supports",
          "warmUp",
          "lessonActivities",
          "materialsNeeded",
        ] as const
      ).map((field) => (
        <td key={field} className={cellClass}>
          <input
            value={fields[field]}
            onChange={(e) => update(field, e.target.value)}
            onBlur={() => blur(field)}
            className={inputClass}
          />
        </td>
      ))}
      <td className={cellClass}>
        <select
          value={day.status}
          onChange={(e) => onSetStatus(day.id, e.target.value as DayStatus)}
          className="text-xs border-none focus:outline-none rounded px-1"
          style={{ backgroundColor: STATUS_COLOR[day.status] }}
        >
          <option value="not_started">{STATUS_LABEL.not_started}</option>
          <option value="completed">{STATUS_LABEL.completed}</option>
          <option value="half_completed">{STATUS_LABEL.half_completed}</option>
        </select>
      </td>
    </tr>
  );
}
