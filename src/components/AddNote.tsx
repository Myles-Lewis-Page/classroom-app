"use client";

import { useState } from "react";

export default function AddNote({
  studentId,
  type,
  onAdded,
}: {
  studentId: string;
  type: "observation" | "praise";
  onAdded: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, type, note: note.trim() }),
    });
    setNote("");
    setSaving(false);
    onAdded();
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={type === "praise" ? "Add a praise note..." : "Add a quick note..."}
        className="border rounded px-2 py-1 text-sm flex-1"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button
        onClick={submit}
        disabled={saving}
        className="btn-primary"
      >
        Add
      </button>
    </div>
  );
}
