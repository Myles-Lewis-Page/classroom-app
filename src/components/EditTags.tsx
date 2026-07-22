"use client";

import { useEffect, useState } from "react";

type Tag = { id: string; name: string };

export default function EditTags({
  studentId,
  currentTagIds,
  onChanged,
}: {
  studentId: string;
  currentTagIds: string[];
  onChanged: () => void;
}) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setAllTags);
  }, []);

  async function toggle(tagId: string, active: boolean) {
    if (active) {
      await fetch(`/api/students/${studentId}/tags?tagId=${tagId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/students/${studentId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
    }
    onChanged();
  }

  async function createAndAddTag() {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    const tag = await res.json();
    await fetch(`/api/students/${studentId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: tag.id }),
    });
    setNewTagName("");
    setAllTags((prev) => [...prev, tag]);
    onChanged();
  }

  return (
    <div className="panel">
      <div className="flex flex-wrap gap-2 mb-2">
        {allTags.map((t) => {
          const active = currentTagIds.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id, active)}
              className={`text-xs px-2 py-1 rounded border ${
                active ? "bg-sky-200 text-slate-800" : "bg-white"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <button onClick={createAndAddTag} className="btn-primary">
          Add Tag
        </button>
      </div>
    </div>
  );
}
