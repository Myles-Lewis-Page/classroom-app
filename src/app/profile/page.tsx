"use client";

import { useEffect, useState } from "react";

const GRADE_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th"];

type Teacher = { name: string; email: string };
type Classroom = { name: string; schoolYear: string };

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("3rd");
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ teacher, classroom }: { teacher: Teacher; classroom: Classroom | null }) => {
        if (teacher?.name) {
          const parts = teacher.name.split(" ");
          setFirstName(parts[0] ?? "");
          setLastName(parts.slice(1).join(" ") ?? "");
        }
        setTeacherEmail(teacher?.email ?? "");
        setCurrentClassroom(classroom);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !grade) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, grade }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setCurrentClassroom(data.classroom);
      setSavedName(data.classroom.name);
    }
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
    </div>
  );
}
