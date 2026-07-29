"use client";

import { useEffect, useState } from "react";

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
  days: Day[];
};

const UNIT_COLORS = [
  "#fecaca", "#fde68a", "#a7f3d0", "#bae6fd", "#ddd6fe", "#fbcfe8", "#fed7aa", "#e0e7ff",
];

export default function PacingGuidePage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [expandedId, setExpandedId] = useState<string>("");
  const [editingId, setEditingId] = useState<string>("");

  // New unit form
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [standards, setStandards] = useState("");
  const [topics, setTopics] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/pacing-units").then((r) => r.json()).then(setUnits);
  }

  async function addUnit() {
    if (!name.trim() || !startDate || !endDate) return;
    setSaving(true);
    await fetch("/api/pacing-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), startDate, endDate, standards, topics }),
    });
    setSaving(false);
    setName("");
    setStartDate("");
    setEndDate("");
    setStandards("");
    setTopics("");
    setShowAddUnit(false);
    load();
  }

  async function removeUnit(unitId: string, unitName: string) {
    if (!confirm(`Remove "${unitName}"? This deletes all of its daily lesson plans too.`)) return;
    await fetch(`/api/pacing-units/${unitId}`, { method: "DELETE" });
    load();
  }

  async function saveUnitEdits(unit: Unit, updates: Partial<Unit>) {
    await fetch(`/api/pacing-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    load();
  }

  async function saveDayField(dayId: string, field: string, value: string) {
    await fetch(`/api/pacing-units/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pacing Guide</h1>
        <button onClick={() => window.print()} className="btn-outline text-sm print:hidden">
          Print
        </button>
      </div>

      {units.length > 0 && (
        <div className="panel mb-6">
          <p className="text-sm font-semibold mb-2">Year at a Glance</p>
          <div className="flex flex-wrap gap-2">
            {units.map((u, i) => (
              <button
                key={u.id}
                onClick={() => setExpandedId(u.id)}
                className="px-3 py-1 rounded text-xs text-left"
                style={{ backgroundColor: UNIT_COLORS[i % UNIT_COLORS.length] }}
              >
                <span className="font-semibold">{u.name}</span>
                <br />
                {new Date(u.startDate).toLocaleDateString()} - {new Date(u.endDate).toLocaleDateString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showAddUnit ? (
        <button onClick={() => setShowAddUnit(true)} className="btn-primary mb-6">
          + Add Unit
        </button>
      ) : (
        <div className="panel mb-6 space-y-2">
          <h2 className="font-semibold">New Unit</h2>
          <input
            placeholder="Unit name (e.g. Unit 1 - Ancient Middle Ages)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          <div className="flex gap-2 flex-wrap">
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
              <label className="block text-xs text-slate-500">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>
          <textarea
            placeholder="Important standards (e.g. 6.1A, 6.2B, 6.3C)"
            value={standards}
            onChange={(e) => setStandards(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            rows={2}
          />
          <textarea
            placeholder="Topics (one per line)"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            rows={3}
          />
          <div className="flex gap-2">
            <button onClick={addUnit} disabled={saving} className="btn-primary">
              {saving ? "Creating..." : "Create Unit"}
            </button>
            <button onClick={() => setShowAddUnit(false)} className="btn-outline">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {units.map((unit, i) => {
          const isExpanded = expandedId === unit.id;
          const isEditing = editingId === unit.id;
          return (
            <div key={unit.id} className="card">
              <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? "" : unit.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: UNIT_COLORS[i % UNIT_COLORS.length] }}
                  />
                  <div>
                    <h3 className="font-bold">{unit.name}</h3>
                    <p className="text-sm text-slate-500">
                      {new Date(unit.startDate).toLocaleDateString()} -{" "}
                      {new Date(unit.endDate).toLocaleDateString()} · {unit.days.length} days
                    </p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingId(isEditing ? "" : unit.id)}
                    className="btn-outline text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeUnit(unit.id, unit.name)}
                    className="text-rose-600 text-xs hover:underline"
                  >
                    Remove Unit
                  </button>
                </div>
              </div>

              {isEditing && (
                <UnitEditForm unit={unit} onSave={(updates) => saveUnitEdits(unit, updates)} />
              )}

              {(unit.standards || unit.topics) && !isEditing && (
                <div className="mt-2 text-sm text-slate-600">
                  {unit.standards && <p>Standards: {unit.standards}</p>}
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

              {isExpanded && (
                <div className="mt-4 overflow-x-auto">
                  <table className="border-collapse text-xs w-full">
                    <thead>
                      <tr className="text-left bg-violet-50/60">
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
                      {unit.days.map((day) => (
                        <DayRow key={day.id} day={day} onSave={saveDayField} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {units.length === 0 && (
          <p className="text-slate-500">No units yet — add your first one above.</p>
        )}
      </div>
    </div>
  );
}

function UnitEditForm({ unit, onSave }: { unit: Unit; onSave: (u: Partial<Unit>) => void }) {
  const [name, setName] = useState(unit.name);
  const [startDate, setStartDate] = useState(unit.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(unit.endDate.slice(0, 10));
  const [standards, setStandards] = useState(unit.standards ?? "");
  const [topics, setTopics] = useState(unit.topics ?? "");

  return (
    <div className="mt-3 panel space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <p className="text-xs text-slate-500">
        Changing dates regenerates the daily rows for this unit - any lesson plan details on days
        outside the new range will be lost.
      </p>
      <textarea
        value={standards}
        onChange={(e) => setStandards(e.target.value)}
        className="border rounded px-2 py-1 w-full"
        rows={2}
        placeholder="Standards"
      />
      <textarea
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
        className="border rounded px-2 py-1 w-full"
        rows={3}
        placeholder="Topics (one per line)"
      />
      <button
        onClick={() => onSave({ name, startDate, endDate, standards, topics })}
        className="btn-primary text-sm"
      >
        Save Unit
      </button>
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
        {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
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
