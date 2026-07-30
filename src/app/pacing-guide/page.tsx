"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UNIT_COLORS } from "@/lib/unitColors";
import { formatShortDate, toDateInputValue } from "@/lib/dateOnly";

type Unit = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standards: string | null;
  topics: string | null;
  days: { id: string }[];
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

      {units.length > 0 && (
        <div className="panel mb-6">
          <p className="text-sm font-semibold mb-2">Year at a Glance</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {units.map((u, i) => (
              <Link
                key={u.id}
                href={`/pacing-guide/${u.id}`}
                className="px-3 py-2 rounded text-xs text-left hover:brightness-95 transition"
                style={{ backgroundColor: UNIT_COLORS[i % UNIT_COLORS.length] }}
              >
                <span className="font-semibold block">{u.name}</span>
                {formatShortDate(u.startDate)} - {formatShortDate(u.endDate)}
              </Link>
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

      <div className="space-y-3">
        {units.map((unit, i) => {
          const isEditing = editingId === unit.id;
          return (
            <div key={unit.id} className="card">
              <div className="flex justify-between items-start">
                <Link href={`/pacing-guide/${unit.id}`} className="flex items-center gap-2 flex-1">
                  <span
                    className="w-3 h-3 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: UNIT_COLORS[i % UNIT_COLORS.length] }}
                  />
                  <div>
                    <h3 className="font-bold hover:underline">{unit.name}</h3>
                    <p className="text-sm text-slate-500">
                      {formatShortDate(unit.startDate)} -{" "}
                      {formatShortDate(unit.endDate)} · {unit.days.length} days
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2">
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
                <UnitEditForm
                  unit={unit}
                  error={editErrors[unit.id]}
                  onSave={(updates) => saveUnitEdits(unit, updates)}
                />
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
