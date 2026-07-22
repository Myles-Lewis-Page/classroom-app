"use client";

import { useState } from "react";

export default function EditBasicInfo({
  studentId,
  initial,
  onSaved,
}: {
  studentId: string;
  initial: {
    firstName: string;
    lastName: string;
    grade: string;
    section: string | null;
    dob: string | null;
    understandingLevel: number | null;
  };
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [grade, setGrade] = useState(initial.grade);
  const [section, setSection] = useState(initial.section ?? "");
  const [dob, setDob] = useState(initial.dob ? initial.dob.slice(0, 10) : "");
  const [understandingLevel, setUnderstandingLevel] = useState(
    initial.understandingLevel?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        grade,
        section: section || null,
        dob: dob || null,
        understandingLevel: understandingLevel ? Number(understandingLevel) : null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="panel grid grid-cols-2 gap-2">
      <input
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First name"
        className="border rounded px-2 py-1"
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Last name"
        className="border rounded px-2 py-1"
      />
      <input
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="Grade"
        className="border rounded px-2 py-1"
      />
      <input
        value={section}
        onChange={(e) => setSection(e.target.value)}
        placeholder="Section"
        className="border rounded px-2 py-1"
      />
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="border rounded px-2 py-1"
      />
      <input
        type="number"
        min={1}
        max={5}
        value={understandingLevel}
        onChange={(e) => setUnderstandingLevel(e.target.value)}
        placeholder="Understanding level (1-5)"
        className="border rounded px-2 py-1"
      />
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary col-span-2 py-1"
      >
        {saving ? "Saving..." : "Save Basic Info"}
      </button>
    </div>
  );
}
