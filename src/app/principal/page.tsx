"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Teacher = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  mustChangePassword: boolean;
};

export default function PrincipalPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justCreated, setJustCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resetFor, setResetFor] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/principal/teachers").then((r) => r.json()).then(setTeachers);
  }

  async function addTeacher() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setError("");
    setJustCreated(null);
    const res = await fetch("/api/principal/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Couldn't add teacher.");
      return;
    }
    setJustCreated({ email: data.teacher.email, tempPassword: data.tempPassword });
    setName("");
    setEmail("");
    load();
  }

  function startEdit(t: Teacher) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditEmail(t.email);
    setResetFor(null);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/principal/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }),
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
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
    </div>
  );
}
