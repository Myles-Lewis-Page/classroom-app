"use client";

import { useEffect, useState } from "react";

const GRADE_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th"];
const GENERIC_SUBJECTS = ["Math", "Reading", "Writing", "Science", "Social Studies", "Spelling"];

type Teacher = { name: string; email: string };
type Classroom = { name: string; schoolYear: string };
type SkillSubject = { id: string; name: string };

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("3rd");
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  // Subjects taught (generic + custom)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [existingSubjects, setExistingSubjects] = useState<SkillSubject[]>([]);

  // Account settings (email/password)
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(
        ({
          teacher,
          classroom,
          skillSubjects,
        }: {
          teacher: Teacher;
          classroom: Classroom | null;
          skillSubjects: SkillSubject[];
        }) => {
          if (teacher?.name) {
            const parts = teacher.name.split(" ");
            setFirstName(parts[0] ?? "");
            setLastName(parts.slice(1).join(" ") ?? "");
          }
          setTeacherEmail(teacher?.email ?? "");
          setNewEmail(teacher?.email ?? "");
          setCurrentClassroom(classroom);
          setExistingSubjects(skillSubjects ?? []);
          setSelectedSubjects((skillSubjects ?? []).map((s) => s.name));
        }
      );
  }, []);

  function toggleSubject(name: string) {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  function addCustomSubject() {
    const name = customSubject.trim();
    if (!name || selectedSubjects.includes(name)) return;
    setSelectedSubjects((prev) => [...prev, name]);
    setCustomSubject("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !grade) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, grade, subjects: selectedSubjects }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setCurrentClassroom(data.classroom);
      setSavedName(data.classroom.name);
      setExistingSubjects(data.skillSubjects ?? []);
    }
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!currentPassword) {
      setAccountError("Enter your current password to confirm changes.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setAccountError("New password and confirmation don't match.");
      return;
    }
    if (!newEmail.trim() && !newPassword) {
      setAccountError("Change the email or enter a new password to update something.");
      return;
    }

    setAccountSaving(true);
    const res = await fetch("/api/profile/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newEmail: newEmail.trim() !== teacherEmail ? newEmail.trim() : undefined,
        newPassword: newPassword || undefined,
      }),
    });
    const data = await res.json();
    setAccountSaving(false);

    if (!res.ok) {
      setAccountError(data.error ?? "Something went wrong.");
      return;
    }

    setTeacherEmail(data.email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setAccountSuccess("Account updated.");
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      <div className="card mb-4">
        <p className="text-sm text-slate-500">Signed in as</p>
        <p className="font-medium">{teacherEmail}</p>
      </div>

      {currentClassroom && (
        <div className="panel mb-4">
          <p className="text-sm text-slate-500">Current classroom</p>
          <p className="font-bold text-lg">{currentClassroom.name}</p>
          <p className="text-xs text-slate-500">{currentClassroom.schoolYear}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold">Your Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="border rounded px-2 py-1"
            required
          />
          <input
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="border rounded px-2 py-1"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Grade you teach</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g} grade
              </option>
            ))}
          </select>
        </div>

        {firstName && lastName && grade && (
          <p className="text-sm text-slate-500">
            Your classroom will be named:{" "}
            <span className="font-mono font-semibold">
              {firstName[0].toUpperCase()}
              {lastName}-{grade}
            </span>
          </p>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">Subjects you teach</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {GENERIC_SUBJECTS.map((subj) => (
              <button
                type="button"
                key={subj}
                onClick={() => toggleSubject(subj)}
                className={`text-sm px-3 py-1 rounded border ${
                  selectedSubjects.includes(subj) ? "btn-primary" : "bg-white"
                }`}
              >
                {subj}
              </button>
            ))}
            {/* Custom subjects already added that aren't in the generic list */}
            {selectedSubjects
              .filter((s) => !GENERIC_SUBJECTS.includes(s))
              .map((subj) => (
                <button
                  type="button"
                  key={subj}
                  onClick={() => toggleSubject(subj)}
                  className="text-sm px-3 py-1 rounded border btn-primary"
                >
                  {subj} ✕
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Add a custom subject (e.g. Spanish)"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSubject();
                }
              }}
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <button type="button" onClick={addCustomSubject} className="btn-outline text-sm">
              Add
            </button>
          </div>
          {existingSubjects.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Note: unchecking a subject here won't delete its skills/history - it'll just stop
              showing as selected. Removing a subject entirely can be done from the Skills tab.
            </p>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-2">
          {saving ? "Saving..." : currentClassroom ? "Update" : "Create Classroom"}
        </button>

        {savedName && (
          <p className="text-emerald-700 text-sm">
            ✅ Classroom "{savedName}" is set up. You can now add students, create assignments,
            and use the rest of the app.
          </p>
        )}
      </form>

      <form onSubmit={handleAccountSubmit} className="card space-y-3 mt-6">
        <h2 className="font-semibold">Account Settings</h2>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Email (used to log in)</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">New password (optional)</label>
          <input
            type="password"
            placeholder="Leave blank to keep current password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        {newPassword && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Current password (required to confirm changes)
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        {accountError && <p className="text-rose-600 text-sm">{accountError}</p>}
        {accountSuccess && <p className="text-emerald-700 text-sm">✅ {accountSuccess}</p>}

        <button type="submit" disabled={accountSaving} className="btn-primary w-full py-2">
          {accountSaving ? "Saving..." : "Update Account"}
        </button>
      </form>
    </div>
  );
}
