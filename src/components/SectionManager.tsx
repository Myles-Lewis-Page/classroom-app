"use client";

import { useState } from "react";
import { useSectionContext } from "@/components/SectionContext";

export default function SectionManager() {
  const { sections, refreshSections } = useSectionContext();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function addSection() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setName("");
    setSaving(false);
    refreshSections();
  }

  async function removeSection(id: string, sectionName: string) {
    if (
      !confirm(
        `Remove "${sectionName}"? Students in it won't be deleted - they'll just no longer belong to a group/section.`
      )
    )
      return;
    await fetch(`/api/sections?sectionId=${id}`, { method: "DELETE" });
    refreshSections();
  }

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold">Class Sections / Groups</h2>
        <p className="text-sm text-slate-500">
          Optional sub-groups within this classroom (e.g. "Group A" / "Group B", or a reading
          group) - not a separate class, just a way to split students up. Once you have at least
          one, a switcher shows up in the top nav on every page so you can flip between groups
          without leaving the page you're on.
        </p>
      </div>

      {sections.length > 0 && (
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
              <span>{s.name}</span>
              <button
                onClick={() => removeSection(s.id, s.name)}
                className="text-rose-600 text-xs hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSection();
            }
          }}
          placeholder="New section/group name"
          className="border rounded px-2 py-1 flex-1"
        />
        <button onClick={addSection} disabled={saving} className="btn-outline text-sm">
          {saving ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}
