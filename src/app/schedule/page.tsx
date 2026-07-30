"use client";

import { useEffect, useMemo, useState } from "react";
import { UNIT_COLORS } from "@/lib/unitColors";

type Classroom = { id: string; name: string; isArchived: boolean };
type SectionOpt = { id: string; name: string };
type ScheduleBlock = {
  id: string;
  label: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  studentsInClass: boolean;
  classroomId: string | null;
  classroom: { id: string; name: string } | null;
  sectionId: string | null;
  section: { id: string; name: string } | null;
};

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const emptyForm = {
  label: "",
  startTime: "",
  endTime: "",
  studentsInClass: true,
  classroomId: "",
  sectionId: "",
};

export default function DailySchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [formSections, setFormSections] = useState<SectionOpt[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: { allClassrooms: Classroom[] }) => {
        setClassrooms((data.allClassrooms || []).filter((c) => !c.isArchived));
      });
  }, []);

  // Whenever the tagged classroom changes, load that classroom's Periods
  // (Sections) so the right list of options shows up - Daily Schedule spans
  // classrooms, so this can't just rely on "the current classroom".
  useEffect(() => {
    if (!form.classroomId) {
      setFormSections([]);
      return;
    }
    fetch(`/api/sections?classroomId=${form.classroomId}`)
      .then((r) => r.json())
      .then(setFormSections)
      .catch(() => setFormSections([]));
  }, [form.classroomId]);

  function load() {
    fetch("/api/schedule-blocks").then((r) => r.json()).then(setBlocks);
  }

  const colorByClassroomId = useMemo(() => {
    const map = new Map<string, string>();
    classrooms.forEach((c, i) => map.set(c.id, UNIT_COLORS[i % UNIT_COLORS.length]));
    return map;
  }, [classrooms]);

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [blocks]
  );

  const overlapIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < sorted.length - 1; i++) {
      if (toMinutes(sorted[i].endTime) > toMinutes(sorted[i + 1].startTime)) {
        ids.add(sorted[i].id);
        ids.add(sorted[i + 1].id);
      }
    }
    return ids;
  }, [sorted]);

  function startEdit(block: ScheduleBlock) {
    setEditingId(block.id);
    setForm({
      label: block.label,
      startTime: block.startTime,
      endTime: block.endTime,
      studentsInClass: block.studentsInClass,
      classroomId: block.classroomId ?? "",
      sectionId: block.sectionId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.label.trim() || !form.startTime || !form.endTime) return;
    setSaving(true);
    const body = {
      label: form.label.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      studentsInClass: form.studentsInClass,
      classroomId: form.classroomId || null,
      sectionId: form.sectionId || null,
    };
    if (editingId) {
      await fetch(`/api/schedule-blocks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/schedule-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    cancelEdit();
    load();
  }

  async function removeBlock(id: string, label: string) {
    if (!confirm(`Remove "${label}" from the schedule?`)) return;
    await fetch(`/api/schedule-blocks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Daily Schedule</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your day, block by block, with real times. Tag each block with which Period/class it is
        (if any) and whether your own students are actually with you for it - useful for
        specials, lunch, and recess where they're not.
      </p>

      <div className="panel mb-6 space-y-2">
        <h2 className="font-semibold text-sm">{editingId ? "Edit Block" : "Add a Block"}</h2>
        <input
          placeholder="Label (e.g. Math, Lunch, Specials - PE)"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className="border rounded px-2 py-1 w-full"
        />
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500">Start time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">End time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Period / class</label>
            <select
              value={form.classroomId}
              onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value, sectionId: "" }))}
              className="border rounded px-2 py-1"
            >
              <option value="">Not tied to a period</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {form.classroomId && formSections.length > 0 && (
            <div>
              <label className="block text-xs text-slate-500">Which Period</label>
              <select
                value={form.sectionId}
                onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
                className="border rounded px-2 py-1"
              >
                <option value="">Whole class</option>
                {formSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm mb-1">
            <input
              type="checkbox"
              checked={form.studentsInClass}
              onChange={(e) => setForm((f) => ({ ...f, studentsInClass: e.target.checked }))}
            />
            Students are in my class for this
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Block"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="btn-outline">
              Cancel
            </button>
          )}
        </div>
      </div>

      {overlapIds.size > 0 && (
        <p className="text-sm text-amber-600 mb-3">
          ⚠️ Some blocks overlap in time - double check the times below.
        </p>
      )}

      <div className="space-y-1">
        {sorted.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded px-3 py-2 text-sm border"
            style={{
              borderLeftWidth: 6,
              borderLeftColor: b.classroomId ? colorByClassroomId.get(b.classroomId) ?? "#cbd5e1" : "#cbd5e1",
              backgroundColor: overlapIds.has(b.id) ? "#fff7ed" : "transparent",
            }}
          >
            <div>
              <p className="font-medium">
                {formatTime(b.startTime)} – {formatTime(b.endTime)}{" "}
                <span className="font-normal">{b.label}</span>
              </p>
              <p className="text-xs text-slate-500">
                {b.classroom ? b.classroom.name : "No period tagged"}
                {b.section ? ` – ${b.section.name}` : ""} ·{" "}
                {b.studentsInClass ? "Students in class" : "Students elsewhere"}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => startEdit(b)} className="text-sky-600 text-xs hover:underline">
                Edit
              </button>
              <button
                onClick={() => removeBlock(b.id, b.label)}
                className="text-rose-600 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-slate-500">No schedule blocks yet - add your first one above.</p>
        )}
      </div>
    </div>
  );
}
