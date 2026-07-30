"use client";

import { useRouter } from "next/navigation";

type ClassroomOption = { id: string; name: string; isArchived: boolean; sections?: { id: string; name: string }[] };

export default function PeriodSwitcher({
  classrooms,
  currentId,
}: {
  classrooms: ClassroomOption[];
  currentId: string;
}) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const classroomId = e.target.value;
    if (classroomId === currentId) return;
    await fetch("/api/profile/switch-classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId }),
    });
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
