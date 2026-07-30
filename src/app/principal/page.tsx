"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { formatShortDate } from "@/lib/dateOnly";

type Teacher = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  mustChangePassword: boolean;
};
type CalEvent = { id: string; name: string; startDate: string; endDate: string; type: string };

export default function PrincipalPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justCreated, setJustCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resetFor, setResetFor] = useState<{ email: string; tempPassword: string } | null>(null);

  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [calName, setCalName] = useState("");
  const [calStart, setCalStart] = useState("");
  const [calEnd, setCalEnd] = useState("");
  const [calType, setCalType] = useState("holiday");
  const [calSaving, setCalSaving] = useState(false);
  const [calError, setCalError] = useState("");

  useEffect(() => {
    load();
    loadCalendar();
  }, []);

  function loadCalendar() {
    fetch("/api/principal/calendar-events").then((r) => r.json()).then(setCalEvents);
  }

  async function addCalEvent() {
    if (!calName.trim() || !calStart) return;
    setCalSaving(true);
    setCalError("");
    const res = await fetch("/api/principal/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: calName.trim(), startDate: calStart, endDate: calEnd || calStart, type: calType }),
    });
    setCalSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCalError(data.error || "Couldn't add that.");
      return;
    }
    setCalName("");
    setCalStart("");
    setCalEnd("");
    loadCalendar();
  }

  async function removeCalEvent(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the school calendar? Every classroom at this school will see it disappear.`)) return;
    await fetch(`/api/principal/calendar-events/${id}`, { method: "DELETE" });
    loadCalendar();
  }

  function load() {
    fetch("/api/principal/teachers").then((r) => r.json()).then(setTeachers);
  }

  async function addTeacher() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    setError("");
    setJustCreated(null);
    const res = await fetch("/api/principal/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Couldn't add teacher.");
      return;
    }
    setJustCreated({ email: data.teacher.email, tempPassword: data.tempPassword });
    setFirstName("");
    setLastName("");
    setEmail("");
    load();
  }

  function startEdit(t: Teacher) {
    setEditingId(t.id);
    const parts = t.name.trim().split(" ");
    setEditFirstName(parts[0] ?? "");
    setEditLastName(parts.slice(1).join(" "));
    setEditEmail(t.email);
    setResetFor(null);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/principal/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim(),
      }),
    });
    setEditingId(null);
    load();
  }

  async function resetPassword(t: Teacher) {
    if (!confirm(`Generate a new temporary password for ${t.name}? Their current password stops working immediately.`)) return;
    const res = await fetch(`/api/principal/teachers/${t.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    setResetFor({ email: t.email, tempPassword: data.tempPassword });
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Principal</h1>
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="text-sm text-slate-500 hover:text-rose-500"
        >
          Log out
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Every Teacher at your school. Only you can change a Teacher&apos;s name or email - they
        can only change their own password.
      </p>

      <div className="panel mb-6">
        <h2 className="font-semibold mb-2">Add Teacher</h2>
        {justCreated && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2 mb-3 text-sm">
            <p className="font-medium">
              Teacher created for {justCreated.email} - share this password with them now, it
              won&apos;t be shown again:
            </p>
            <p className="font-mono font-bold mt-1">{justCreated.tempPassword}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <button onClick={addTeacher} disabled={saving} className="btn-primary text-sm">
            {saving ? "Adding..." : "Add Teacher"}
          </button>
        </div>
        {error && <p className="text-rose-600 text-sm mt-1">{error}</p>}
      </div>

      <div className="panel">
        <h2 className="font-semibold mb-2">Teachers</h2>
        <ul className="space-y-2">
          {teachers.map((t) => (
            <li key={t.id} className="text-sm border rounded px-2 py-2">
              {editingId === t.id ? (
                <div className="flex gap-2 flex-wrap items-end">
                  <input
                    placeholder="First name"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    placeholder="Last name"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <button onClick={() => saveEdit(t.id)} className="btn-primary text-xs">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-outline text-xs">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <span>
                    <span className="font-medium">{t.name}</span> · {t.email}
                    {t.mustChangePassword && (
                      <span className="ml-2 text-xs text-amber-600">(hasn&apos;t changed temp password yet)</span>
                    )}
                  </span>
                  <span className="flex gap-3 shrink-0">
                    <button onClick={() => startEdit(t)} className="text-sky-600 text-xs hover:underline">
                      Edit
                    </button>
                    <button onClick={() => resetPassword(t)} className="text-amber-600 text-xs hover:underline">
                      Reset Password
                    </button>
                  </span>
                </div>
              )}
              {resetFor?.email === t.email && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2 text-xs">
                  New password for {t.email} - share it now, it won&apos;t be shown again:{" "}
                  <span className="font-mono font-bold">{resetFor.tempPassword}</span>
                </div>
              )}
            </li>
          ))}
          {teachers.length === 0 && <p className="text-slate-400 text-sm">No teachers yet.</p>}
        </ul>
      </div>

      <div className="panel mt-6">
        <h2 className="font-semibold mb-2">School Calendar</h2>
        <p className="text-sm text-slate-500 mb-3">
          Days off, teacher work days, half days, and reminders here apply to every classroom at
          this school - Teachers see them but can&apos;t edit or delete them. Teachers can still add
          their own local calendar entries that only affect their own classroom.
        </p>
        <ul className="space-y-1 mb-3">
          {calEvents.map((e) => (
            <li key={e.id} className="text-sm border rounded px-2 py-1 flex justify-between items-center">
              <span>
                <span className="font-medium">{e.name}</span> ·{" "}
                {formatShortDate(e.startDate)}
                {e.endDate !== e.startDate && ` - ${formatShortDate(e.endDate)}`} ·{" "}
                <span className="text-slate-500">{e.type.replace("_", " ")}</span>
              </span>
              <button onClick={() => removeCalEvent(e.id, e.name)} className="text-rose-600 text-xs hover:underline">
                Remove
              </button>
            </li>
          ))}
          {calEvents.length === 0 && <p className="text-slate-400 text-sm">No school-wide calendar entries yet.</p>}
        </ul>
        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="Name (e.g. Winter Break)"
            value={calName}
            onChange={(e) => setCalName(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <div>
            <label className="block text-xs text-slate-500">Start</label>
            <input type="date" value={calStart} onChange={(e) => setCalStart(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">End (optional)</label>
            <input type="date" value={calEnd} onChange={(e) => setCalEnd(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <select value={calType} onChange={(e) => setCalType(e.target.value)} className="border rounded px-2 py-1">
            <option value="holiday">Holiday (no school)</option>
            <option value="teacher_work_day">Teacher Work Day</option>
            <option value="half_day">Half Day</option>
            <option value="other">Other / Reminder</option>
          </select>
          <button onClick={addCalEvent} disabled={calSaving} className="btn-primary text-sm">
            {calSaving ? "Adding..." : "Add"}
          </button>
        </div>
        {calError && <p className="text-rose-600 text-sm mt-1">{calError}</p>}
      </div>
    </div>
  );
}
