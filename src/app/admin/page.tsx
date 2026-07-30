"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type School = { id: string; name: string; _count: { principals: number; teachers: number } };
type Principal = { id: string; name: string; email: string; school: { id: string; name: string } };

export default function AdminPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolError, setSchoolError] = useState("");

  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pSchoolId, setPSchoolId] = useState("");
  const [savingPrincipal, setSavingPrincipal] = useState(false);
  const [principalError, setPrincipalError] = useState("");
  const [justCreated, setJustCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/admin/schools").then((r) => r.json()).then(setSchools);
    fetch("/api/admin/principals").then((r) => r.json()).then(setPrincipals);
  }

  async function addSchool() {
    if (!newSchoolName.trim()) return;
    setSavingSchool(true);
    setSchoolError("");
    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSchoolName.trim() }),
    });
    setSavingSchool(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSchoolError(data.error || "Couldn't create school.");
      return;
    }
    setNewSchoolName("");
    load();
  }

  async function addPrincipal() {
    if (!pName.trim() || !pEmail.trim() || !pSchoolId) return;
    setSavingPrincipal(true);
    setPrincipalError("");
    setJustCreated(null);
    const res = await fetch("/api/admin/principals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pName.trim(), email: pEmail.trim(), schoolId: pSchoolId }),
    });
    setSavingPrincipal(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPrincipalError(data.error || "Couldn't create principal.");
      return;
    }
    setJustCreated({ email: data.principal.email, tempPassword: data.tempPassword });
    setPName("");
    setPEmail("");
    setPSchoolId("");
    load();
  }

  async function changePassword() {
    setPwError("");
    setPwSuccess("");
    if (!currentPassword || !newPassword) {
      setPwError("Enter your current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPwError(data.error || "Couldn't change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwSuccess("Password updated.");
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="text-sm text-slate-500 hover:text-rose-500"
        >
          Log out
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Schools and Principals only - no Teacher, classroom, or student data is visible here or
        anywhere else in this account.
      </p>

      <div className="panel mb-6">
        <h2 className="font-semibold mb-2">Schools</h2>
        <ul className="space-y-1 mb-3">
          {schools.map((s) => (
            <li key={s.id} className="text-sm border rounded px-2 py-1 flex justify-between">
              <span>{s.name}</span>
              <span className="text-slate-400">
                {s._count.principals} principal{s._count.principals === 1 ? "" : "s"} ·{" "}
                {s._count.teachers} teacher{s._count.teachers === 1 ? "" : "s"}
              </span>
            </li>
          ))}
          {schools.length === 0 && <p className="text-slate-400 text-sm">No schools yet.</p>}
        </ul>
        <div className="flex gap-2">
          <input
            placeholder="New school name"
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <button onClick={addSchool} disabled={savingSchool} className="btn-primary text-sm">
            {savingSchool ? "Adding..." : "Add School"}
          </button>
        </div>
        {schoolError && <p className="text-rose-600 text-sm mt-1">{schoolError}</p>}
      </div>

      <div className="panel">
        <h2 className="font-semibold mb-2">Principals</h2>
        <ul className="space-y-1 mb-3">
          {principals.map((p) => (
            <li key={p.id} className="text-sm border rounded px-2 py-1">
              <span className="font-medium">{p.name}</span> · {p.email} · {p.school.name}
            </li>
          ))}
          {principals.length === 0 && <p className="text-slate-400 text-sm">No principals yet.</p>}
        </ul>

        {justCreated && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2 mb-3 text-sm">
            <p className="font-medium">
              Principal created for {justCreated.email} - share this password with them now, it
              won&apos;t be shown again:
            </p>
            <p className="font-mono font-bold mt-1">{justCreated.tempPassword}</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="Name"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Email"
            type="email"
            value={pEmail}
            onChange={(e) => setPEmail(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <select
            value={pSchoolId}
            onChange={(e) => setPSchoolId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Select school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button onClick={addPrincipal} disabled={savingPrincipal} className="btn-primary text-sm">
            {savingPrincipal ? "Adding..." : "Add Principal"}
          </button>
        </div>
        {principalError && <p className="text-rose-600 text-sm mt-1">{principalError}</p>}
      </div>

      <div className="panel mt-6">
        <h2 className="font-semibold mb-2">Change Your Password</h2>
        <div className="space-y-2 max-w-xs">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          {pwError && <p className="text-rose-600 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-emerald-700 text-sm">✅ {pwSuccess}</p>}
          <button onClick={changePassword} disabled={pwSaving} className="btn-primary text-sm">
            {pwSaving ? "Saving..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
