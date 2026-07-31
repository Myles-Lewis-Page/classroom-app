"use client";

type ClassroomOption = { id: string; name: string; isArchived: boolean; sections?: { id: string; name: string }[] };

export default function PeriodSwitcher({
  classrooms,
  currentId,
}: {
  classrooms: ClassroomOption[];
  currentId: string;
}) {
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const classroomId = e.target.value;
    if (classroomId === currentId) return;
    await fetch("/api/profile/switch-classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId }),
    });
    // Every page in the app fetches its own classroom-scoped data itself in
    // a useEffect on mount only - router.refresh() only re-renders Server
    // Components (Nav, the Period list), it can't make an already-mounted
    // client page refetch. A full reload is the only way to guarantee every
    // page (current and future) actually shows the newly-active classroom's
    // data instead of silently continuing to show the old one's.
    window.location.reload();
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
        </option>
      ))}
    </select>
  );
}
