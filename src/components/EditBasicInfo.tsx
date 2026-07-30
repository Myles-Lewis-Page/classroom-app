"use client";

import { useEffect, useState } from "react";

type SectionOption = { id: string; name: string };
type ClassroomOption = { id: string; name: string; isArchived: boolean };

export default function EditBasicInfo({
  studentId,
  initial,
  onSaved,
}: {
  studentId: string;
  initial: {
    firstName: string;
    lastName: string;
    grade: string | null;
    section: string | null;
    sectionId?: string | null;
    classroomId?: string;
    dob: string | null;
    understandingLevel: number | null;
  };
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [grade, setGrade] = useState(initial.grade ?? "");
  const [section, setSection] = useState(initial.section ?? "");
  const [classroomId, setClassroomId] = useState(initial.classroomId ?? "");
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [sectionId, setSectionId] = useState(initial.sectionId ?? "");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [dob, setDob] = useState(initial.dob ? initial.dob.slice(0, 10) : "");
  const [understandingLevel, setUnderstandingLevel] = useState(
    initial.understandingLevel?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: { allClassrooms?: ClassroomOption[] }) => {
        setClassrooms((data.allClassrooms || []).filter((c) => !c.isArchived));
      });
  }, []);

  // Periods belong to whichever Class is currently selected - reload
  // whenever that changes so switching classes doesn't leave a stale list
  // of Periods from the old one on screen.
  useEffect(() => {
    if (!classroomId) {
      setSections([]);
      return;
    }
    fetch(`/api/sections?classroomId=${classroomId}`)
      .then((r) => r.json())
      .then((opts: SectionOption[]) => {
        setSections(opts);
        // If we just switched to a different class, the old Period no
        // longer applies unless it happens to exist under the new one too.
        if (classroomId !== initial.classroomId && !opts.some((s) => s.id === sectionId)) {
          setSectionId("");
        }
      })
      .catch(() => setSections([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

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
        classroomId: classroomId || undefined,
        sectionId: sectionId || null,
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
        placeholder="Grade (optional)"
        className="border rounded px-2 py-1"
      />
      <input
        value={section}
        onChange={(e) => setSection(e.target.value)}
        placeholder="Section"
        className="border rounded px-2 py-1"
      />
      <select
        value={classroomId}
        onChange={(e) => setClassroomId(e.target.value)}
        className="border rounded px-2 py-1"
        title="Which class this student belongs to"
      >
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        className="border rounded px-2 py-1"
        title="Period within this class"
      >
        <option value="">No Period</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
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
      {classroomId !== initial.classroomId && (
        <p className="col-span-2 text-xs text-amber-600">
          Moving this student to a different class - their seating chart spot will be cleared
          (seats are class-specific), and any assignments/grades from their old class stay
          attached to that class&apos;s records.
        </p>
      )}
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
