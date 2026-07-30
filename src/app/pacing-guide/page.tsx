"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UNIT_COLORS } from "@/lib/unitColors";
import { formatShortDate, toDateInputValue } from "@/lib/dateOnly";

type UnitTopicOpt = { id: string; name: string };
type PeriodDate = {
  sectionId: string;
  sectionName: string;
  startDate: string;
  endDate: string;
  tag: "extra" | "early" | null;
  extraDays: number;
};
type Unit = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standards: string | null;
  topics: string | null;
  unitTopics: UnitTopicOpt[];
  periodDates: PeriodDate[];
  days: { id: string; date: string; dayNumber: number }[];
};

export default function PacingGuidePage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [editingId, setEditingId] = useState<string>("");

  // New unit form
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [standards, setStandards] = useState("");
  const [topics, setTopics] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/pacing-units").then((r) => r.json()).then(setUnits);
  }

  async function addUnit() {
    if (!name.trim() || !startDate || !endDate) return;
    setSaving(true);
    setCreateError("");
    const res = await fetch("/api/pacing-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), startDate, endDate, standards, topics }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error || "Couldn't create the unit.");
      return;
    }
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
    const res = await fetch(`/api/pacing-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditErrors((prev) => ({ ...prev, [unit.id]: data.error || "Couldn't save changes." }));
      return;
    }
    setEditErrors((prev) => ({ ...prev, [unit.id]: "" }));
    setEditingId("");
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pacing Guide</h1>
        <button onClick={() => window.print()} className="btn-outline text-sm print:hidden">
          Print
        </button>
      </div>

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
          {createError && <p className="text-sm text-rose-600">{createError}</p>}
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit, i) => {
          const isEditing = editingId === unit.id;
          const color = UNIT_COLORS[i % UNIT_COLORS.length];
          const standardsList = (unit.standards ?? "")
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
          return (
            <div key={unit.id} className="rounded-lg border overflow-hidden flex flex-col">
              <div className="p-3" style={{ backgroundColor: color }}>
                <div className="flex justify-between items-start gap-2">
                  <Link href={`/pacing-guide/${unit.id}`} className="flex-1">
                    <h3 className="font-bold hover:underline">{unit.name}</h3>
                    <p className="text-sm text-slate-700">
                      Targeted: {formatShortDate(unit.startDate)} - {formatShortDate(unit.endDate)}
                      {" · "}
                      {unit.days.length} days
                    </p>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(isEditing ? "" : unit.id)} className="btn-outline text-xs bg-white">
                      Edit
                    </button>
                    <button
                      onClick={() => removeUnit(unit.id, unit.name)}
                      className="text-rose-700 text-xs hover:underline bg-white px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {unit.periodDates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {unit.periodDates.map((p) => (
                      <div
                        key={p.sectionId}
                        className="text-[11px] bg-white/70 rounded px-2 py-1 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">{p.sectionName}</span>
                        <span className="text-slate-600">
                          {formatShortDate(p.startDate)} - {formatShortDate(p.endDate)}
                          {p.tag === "extra" && (
                            <span className="ml-1 text-amber-700 font-semibold">
                              +{p.extraDays} day{p.extraDays === 1 ? "" : "s"}
                            </span>
                          )}
                          {p.tag === "early" && (
                            <span className="ml-1 text-emerald-700 font-semibold">
                              {Math.abs(p.extraDays)} day{Math.abs(p.extraDays) === 1 ? "" : "s"} early
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-white flex-1 space-y-3">
                {standardsList.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Standards</p>
                    <div className="flex flex-wrap gap-1">
                      {standardsList.map((s, si) => (
                        <span key={si} className="text-[11px] bg-slate-100 rounded px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {unit.unitTopics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Topics</p>
                    <div className="flex flex-wrap gap-1">
                      {unit.unitTopics.map((t, ti) => (
                        <span
                          key={t.id}
                          className="text-[11px] rounded px-2 py-0.5"
                          style={{ backgroundColor: UNIT_COLORS[ti % UNIT_COLORS.length] }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {standardsList.length === 0 && unit.unitTopics.length === 0 && (
                  <p className="text-xs text-slate-400">No standards or topics added yet.</p>
                )}
              </div>

              {isEditing && (
                <div className="p-3 border-t">
                  <UnitEditForm
                    unit={unit}
                    error={editErrors[unit.id]}
                    onSave={(updates) => saveUnitEdits(unit, updates)}
                  />
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

function UnitEditForm({
  unit,
  error,
  onSave,
}: {
  unit: Unit;
  error?: string;
  onSave: (u: Partial<Unit>) => void;
}) {
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
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        onClick={() => onSave({ name, startDate, endDate, standards, topics })}
        className="btn-primary text-sm"
      >
        Save Unit
      </button>
    </div>
  );
}
