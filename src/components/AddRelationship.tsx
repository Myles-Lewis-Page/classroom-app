"use client";

import { useEffect, useState } from "react";

type StudentOption = { id: string; firstName: string; lastName: string };

export default function AddRelationship({
  studentId,
  onAdded,
}: {
  studentId: string;
  onAdded: () => void;
}) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [relatedId, setRelatedId] = useState("");
  const [type, setType] = useState<"works_well" | "conflict">("works_well");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((all: StudentOption[]) => setStudents(all.filter((s) => s.id !== studentId)));
  }, [studentId]);

  async function add() {
    if (!relatedId) return;
    setSaving(true);
    await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, relatedStudentId: relatedId, type }),
    });
    setSaving(false);
    onAdded();
  }

  return (
    <div className="flex gap-2 items-center flex-wrap text-sm">
      <select
        value={relatedId}
        onChange={(e) => setRelatedId(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="">Select student...</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.lastName}, {s.firstName}
          </option>
        ))}
      </select>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "works_well" | "conflict")}
        className="border rounded px-2 py-1"
      >
        <option value="works_well">Works well with</option>
        <option value="conflict">Does not work well with</option>
      </select>
      <button
        onClick={add}
        disabled={saving || !relatedId}
        className="btn-primary"
      >
        Add
      </button>
    </div>
  );
}
