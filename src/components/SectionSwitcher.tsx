"use client";

import { useSectionContext } from "@/components/SectionContext";

export default function SectionSwitcher() {
  const { sections, activeSectionId, setActiveSectionId } = useSectionContext();

  if (sections.length === 0) return null;

  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-slate-400">Period:</span>
      <select
        value={activeSectionId ?? "__all__"}
        onChange={(e) => setActiveSectionId(e.target.value === "__all__" ? null : e.target.value)}
        className="text-sm border rounded px-2 py-0.5 bg-white text-slate-600"
        title="Switch Period"
      >
        <option value="__all__">All Students</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </span>
  );
}
