"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { UNIT_COLORS } from "@/lib/unitColors";

type Day = {
  id: string;
  date: string;
  topic: string | null;
  learningTarget: string | null;
  standards: string | null;
  supports: string | null;
  lessonActivities: string | null;
  warmUp: string | null;
  materialsNeeded: string | null;
};
type Unit = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standards: string | null;
  topics: string | null;
  summatives: string | null;
  datesToRemember: string | null;
  days: Day[];
};

function mondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthsBetween(start: Date, end: Date): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function MiniCalendar({
  year,
  month,
  startDate,
  endDate,
  color,
}: {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  color: string;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const firstCell = mondayOf(firstOfMonth);
  const weeks: Date[][] = [];
  let cursor = new Date(firstCell);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor > firstOfMonth) break;
  }

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

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
                const inMonth = day.getMonth() === month;
                const inRange = day >= startDate && day <= endDate;
                return (
                  <td
                    key={di}
                    className="p-1 text-center rounded"
                    style={{
                      backgroundColor: inRange ? color : "transparent",
                      color: inMonth ? "#1e293b" : "#cbd5e1",
                    }}
                  >
                    {day.getDate()}
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

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [summatives, setSummatives] = useState("");
  const [datesToRemember, setDatesToRemember] = useState("");

  useEffect(() => {
    load();
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
      .then((u: Unit) => {
        setUnit(u);
        setSummatives(u.summatives ?? "");
        setDatesToRemember(u.datesToRemember ?? "");
      });
  }

  async function saveNotes() {
    await fetch(`/api/pacing-units/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summatives, datesToRemember }),
    });
  }

  async function saveDayField(dayId: string, field: string, value: string) {
    await fetch(`/api/pacing-units/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  if (!unit) return <div className="p-6">Loading...</div>;

  const color = UNIT_COLORS[colorIndex % UNIT_COLORS.length];
  const startDate = new Date(unit.startDate);
  const endDate = new Date(unit.endDate);
  const months = monthsBetween(startDate, endDate);

  // Group days into calendar weeks (Mon-Fri) for the "Week 1 / Week 2..."
  // tables, matching the planning-doc layout.
  const weekMap = new Map<string, Day[]>();
  unit.days.forEach((day) => {
    const key = mondayOf(new Date(day.date)).toISOString();
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(day);
  });
  const weeks = Array.from(weekMap.entries()).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link href="/pacing-guide" className="text-sky-600 text-sm hover:underline">
        ← Back to Pacing Guide
      </Link>

      <div className="rounded-lg p-4 sm:p-6 my-4" style={{ backgroundColor: color }}>
        <h1 className="text-2xl font-bold mb-3">{unit.name} - Lesson Plans</h1>
        <div className="flex gap-6 flex-wrap text-sm">
          <div>
            <span className="text-slate-600">Unit Start</span>
            <p className="font-semibold">{startDate.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-slate-600">Unit End</span>
            <p className="font-semibold">{endDate.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-slate-600">Days in Unit</span>
            <p className="font-semibold">{unit.days.length}</p>
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
              endDate={endDate}
              color={color}
            />
          ))}
        </div>

        <div className="panel">
          <p className="font-semibold text-sm mb-2">Summatives</p>
          <textarea
            value={summatives}
            onChange={(e) => setSummatives(e.target.value)}
            onBlur={saveNotes}
            placeholder={"One per line, e.g.\n8/20/26: Band Field Trip"}
            className="border rounded px-2 py-1 w-full text-sm mb-4"
            rows={4}
          />
          <p className="font-semibold text-sm mb-2">Dates to Remember</p>
          <textarea
            value={datesToRemember}
            onChange={(e) => setDatesToRemember(e.target.value)}
            onBlur={saveNotes}
            placeholder={"One per line, e.g.\n9/4/26: Half Day"}
            className="border rounded px-2 py-1 w-full text-sm"
            rows={4}
          />
        </div>
      </div>

      {(unit.standards || unit.topics) && (
        <div className="panel mb-6 text-sm">
          {unit.standards && <p className="mb-2">Standards: {unit.standards}</p>}
          {unit.topics && (
            <div>
              Topics:
              <ul className="list-disc list-inside">
                {unit.topics.split("\n").filter(Boolean).map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {weeks.map(([weekKey, days], wi) => (
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
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <DayRow key={day.id} day={day} onSave={saveDayField} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function DayRow({
  day,
  onSave,
}: {
  day: Day;
  onSave: (dayId: string, field: string, value: string) => void;
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

  function update(field: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  function blur(field: keyof typeof fields) {
    onSave(day.id, field, fields[field]);
  }

  const cellClass = "border p-1";
  const inputClass = "w-full text-xs border-none focus:outline-none focus:bg-sky-50";

  return (
    <tr>
      <td className={`${cellClass} whitespace-nowrap font-medium`}>
        {new Date(day.date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
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
    </tr>
  );
}
