"use client";

import type { SectionOption } from "@/components/SectionContext";

/**
 * A page-local Period picker - unlike the old global nav switcher, each
 * page that needs one now owns its own selection (plain local state, not
 * persisted or shared across pages/navigation). Renders nothing if the
 * classroom has no Periods set up.
 */
export default function PeriodPicker({
  sections,
  value,
  onChange,
  allLabel = "All Periods",
  label,
}: {
  sections: SectionOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  allLabel?: string;
  label?: string;
}) {
  if (sections.length === 0) return null;

  return (
    <span className="flex items-center gap-1">
      {label && <span className="text-xs text-slate-500">{label}</span>}
      <select
        value={value ?? "__all__"}
        onChange={(e) => onChange(e.target.value === "__all__" ? null : e.target.value)}
        className="text-sm border rounded px-2 py-1 bg-white text-slate-700"
      >
        <option value="__all__">{allLabel}</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </span>
  );
}
