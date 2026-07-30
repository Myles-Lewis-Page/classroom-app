"use client";

import { useRouter } from "next/navigation";
import { useSectionContext } from "@/components/SectionContext";

type ClassroomOption = { id: string; name: string; isArchived: boolean; sections?: { id: string; name: string }[] };

export default function PeriodSwitcher({
  classrooms,
  currentId,
}: {
  classrooms: ClassroomOption[];
  currentId: string;
}) {
  const router = useRouter();
  const { refreshSections } = useSectionContext();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const classroomId = e.target.value;
    if (classroomId === currentId) return;
    await fetch("/api/profile/switch-classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId }),
    });
    // SectionContext only fetches Periods once on initial app load - it has
    // no way to know the active classroom just changed underneath it, so
    // without this it keeps showing whichever classroom's Periods were
    // loaded first, even after switching to one with none (or different
    // ones). router.refresh() alone only re-renders Server Components.
    refreshSections();
    router.refresh();
  }

  if (classrooms.length <= 1) return null;

  return (
    <select
      value={currentId}
      onChange={handleChange}
      className="text-sm border rounded px-2 py-0.5 bg-white text-slate-600"
      title="Switch classroom"
    >
      {classrooms.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.isArchived ? " (archived)" : ""}
          {c.sections && c.sections.length > 0 ? ` — ${c.sections.map((s) => s.name).join(", ")}` : ""}
        </option>
      ))}
    </select>
  );
}
