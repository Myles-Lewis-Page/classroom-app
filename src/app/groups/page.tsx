"use client";

import { useEffect, useState, useMemo } from "react";
import { buildGroups, Group, StudentForGrouping } from "@/lib/groupBuilder";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  understandingLevel: number | null;
  sectionId: string | null;
};
type Relationship = { studentId: string; relatedStudentId: string; type: string };

export default function GroupBuilderPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [groupSize, setGroupSize] = useState(4);
  const [sortMode, setSortMode] = useState<"homogeneous" | "heterogeneous">("heterogeneous");
  const [groups, setGroups] = useState<Group[]>([]);

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  useEffect(() => {
    fetch("/api/groups/data")
      .then((r) => r.json())
      .then(({ students, relationships }) => {
        setStudents(students);
        setRelationships(relationships);
      });
  }, []);

  function generate() {
    const visibleIds = new Set(visibleStudents.map((s) => s.id));
    const forGrouping: StudentForGrouping[] = visibleStudents.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      level: s.understandingLevel ?? 3,
    }));

    const relevant = relationships.filter(
      (r) => visibleIds.has(r.studentId) && visibleIds.has(r.relatedStudentId)
    );
    const conflicts = relevant
      .filter((r) => r.type === "conflict")
      .map((r) => ({ a: r.studentId, b: r.relatedStudentId }));
    const preferences = relevant
      .filter((r) => r.type === "works_well")
      .map((r) => ({ a: r.studentId, b: r.relatedStudentId }));

    const result = buildGroups(forGrouping, groupSize, conflicts, preferences, sortMode);
    setGroups(result);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Group Builder</h1>

      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div>
          <label className="block text-sm mb-1">Group size</label>
          <input
            type="number"
            min={2}
            value={groupSize}
            onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Sort mode</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "homogeneous" | "heterogeneous")}
            className="border rounded px-2 py-1"
          >
            <option value="heterogeneous">Heterogeneous (mixed levels)</option>
            <option value="homogeneous">Homogeneous (similar levels)</option>
          </select>
        </div>
        <button onClick={generate} className="btn-primary px-4 py-2">
          Generate Groups
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Students marked as "does not work well with" each other will never be placed in the same
        group. This is a hard rule and always takes priority over level sorting.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((g, i) => (
          <div
            key={i}
            className={`border rounded p-4 ${g.hasUnresolvedConflictRisk ? "border-rose-300 bg-rose-50" : ""}`}
          >
            <h3 className="font-bold mb-2">
              Group {i + 1}
              {g.hasUnresolvedConflictRisk && (
                <span className="text-rose-600 text-sm ml-2">⚠️ Conflict — please review</span>
              )}
            </h3>
            <ul className="text-sm">
              {g.students.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
