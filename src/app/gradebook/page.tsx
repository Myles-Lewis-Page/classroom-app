"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSectionContext, filterBySection } from "@/components/SectionContext";
import { effectiveGradePercent, daysLate } from "@/lib/grading";
import { formatShortDate } from "@/lib/dateOnly";

type Student = { id: string; firstName: string; lastName: string; sectionId: string | null };
type SkillSubject = { id: string; name: string };
type GradeCategory = { id: string; name: string; weight: number };
type Entry = {
  status: string;
  gradeStatus: string | null;
  gradeScore: number | null;
  submittedAt: string | null;
  student: { id: string };
};
type Assignment = {
  id: string;
  name: string;
  assignedDate: string;
  dueDate: string | null;
  gradingType: string;
  maxPoints: number | null;
  latePenaltyPercentPerDay: number | null;
  skillSubjectId: string | null;
  gradeCategoryId: string | null;
  entries: Entry[];
  sections: { id: string }[];
};

export default function GradebookPage() {
  const { activeSectionId, sections } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [showWeights, setShowWeights] = useState(false);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryWeight, setNewCategoryWeight] = useState("0");
  // Independent of the top-nav Period switcher: "combined" always shows every
  // student in one table regardless of which Period is active up top; "byPeriod"
  // renders one table per Period. The nav switcher still narrows things like
  // Roster/Behavior elsewhere - this is just for how the Gradebook itself reads.
  const [viewMode, setViewMode] = useState<"combined" | "byPeriod">("combined");

  const visibleStudents = useMemo(
    () => (viewMode === "combined" ? students : filterBySection(students, activeSectionId)),
    [students, activeSectionId, viewMode]
  );

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    fetch("/api/skill-subjects").then((r) => r.json()).then(setSubjects);
    loadCategories();
    // Drafts (not yet handed out) never show on the Gradebook.
    fetch("/api/assignments?handedOut=true").then((r) => r.json()).then(setAssignments);
  }, []);

  function loadCategories() {
    fetch("/api/grade-categories")
      .then((r) => r.json())
      .then((cats: GradeCategory[]) => {
        setCategories(cats);
        setWeightInputs(Object.fromEntries(cats.map((c) => [c.id, String(c.weight)])));
      });
  }

  async function saveWeight(category: GradeCategory) {
    const weight = Number(weightInputs[category.id]) || 0;
    await fetch("/api/grade-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: category.name, weight }),
    });
    loadCategories();
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await fetch("/api/grade-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim(), weight: Number(newCategoryWeight) || 0 }),
    });
    setNewCategoryName("");
    setNewCategoryWeight("0");
    loadCategories();
  }

  async function removeCategory(categoryId: string) {
    if (!confirm("Remove this grading category? Assignments using it will just show as uncategorized.")) return;
    await fetch(`/api/grade-categories?categoryId=${categoryId}`, { method: "DELETE" });
    loadCategories();
  }

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  const visibleAssignments = assignments
    .filter((a) => (selectedSubjectId === "all" ? true : a.skillSubjectId === selectedSubjectId))
    .filter(
      (a) =>
        viewMode === "combined" ||
        !activeSectionId ||
        a.sections.length === 0 ||
        a.sections.some((s) => s.id === activeSectionId)
    );

  function assignmentsForSection(sectionId: string) {
    return assignments
      .filter((a) => (selectedSubjectId === "all" ? true : a.skillSubjectId === selectedSubjectId))
      .filter((a) => a.sections.length === 0 || a.sections.some((s) => s.id === sectionId));
  }

  function entryFor(assignment: Assignment, studentId: string) {
    return assignment.entries.find((e) => e.student.id === studentId);
  }

  // "Missing" (never handed in) or "Late" (handed in after the due date) -
  // shown as a small tag under the grade in each cell. Neither applies once
  // there's no due date to compare against, or the work's handed in on time.
  function submissionTag(assignment: Assignment, entry: Entry | undefined): "Missing" | "Late" | null {
    if (!entry) return null;
    if (entry.status === "missing") return "Missing";
    if (entry.status === "handed_in" && assignment.dueDate && entry.submittedAt) {
      if (new Date(entry.submittedAt) > new Date(assignment.dueDate)) return "Late";
    }
    return null;
  }

  function cellDisplay(assignment: Assignment, entry: Entry | undefined) {
    if (!entry) return { text: "—", color: "#f5f3ff" };
    const late = daysLate(assignment, entry);
    const pct = effectiveGradePercent(assignment, entry);

    if (assignment.gradingType === "points") {
      if (entry.gradeScore === null) return { text: "—", color: "#f5f3ff" };
      const color = pct !== null && pct >= 90 ? "#a7f3d0" : pct !== null && pct >= 70 ? "#fde68a" : "#fecaca";
      const penaltyNote = late > 0 && assignment.latePenaltyPercentPerDay ? ` (${pct}% after late penalty)` : "";
      return { text: `${entry.gradeScore}/${assignment.maxPoints}${penaltyNote}`, color };
    }
    if (entry.gradeStatus === "complete") {
      const label = late > 0 && assignment.latePenaltyPercentPerDay ? `Complete (${pct}%)` : "Complete (100%)";
      return { text: label, color: pct !== null && pct < 100 ? "#fde68a" : "#a7f3d0" };
    }
    if (entry.gradeStatus === "incomplete") return { text: "Incomplete (0%)", color: "#fecaca" };
    return { text: "Not graded", color: "#f5f3ff" };
  }

  // Percent earned (0-100) for one assignment/student, late penalty already
  // applied - or null if ungraded. Thin wrapper so the rest of this file's
  // weighted-average logic doesn't need to change.
  function entryPercent(assignment: Assignment, entry: Entry | undefined): number | null {
    if (!entry) return null;
    return effectiveGradePercent(assignment, entry);
  }

  // Average % for one student within just one category's assignments - the
  // same inner calculation studentWeightedAverage does per-category, pulled
  // out standalone so the per-category "Section Grade" tables can use it too.
  function categoryAverage(studentId: string, catAssignments: Assignment[]): number | null {
    const percents = catAssignments
      .map((a) => entryPercent(a, entryFor(a, studentId)))
      .filter((p): p is number => p !== null);
    if (percents.length === 0) return null;
    return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
  }

  // Weighted overall grade: average % within each category, then combine
  // using that category's weight, normalized against only the categories
  // that actually have graded work (so missing categories don't distort it).
  function studentWeightedAverage(studentId: string, forAssignments: Assignment[] = visibleAssignments): number | null {
    let weightedSum = 0;
    let weightUsed = 0;

    categories.forEach((cat) => {
      const catAssignments = forAssignments.filter((a) => a.gradeCategoryId === cat.id);
      const percents = catAssignments
        .map((a) => entryPercent(a, entryFor(a, studentId)))
        .filter((p): p is number => p !== null);
      if (percents.length === 0) return;
      const catAvg = percents.reduce((sum, p) => sum + p, 0) / percents.length;
      weightedSum += catAvg * cat.weight;
      weightUsed += cat.weight;
    });

    // Uncategorized assignments count as their own equal-weight bucket
    const uncategorized = forAssignments.filter((a) => !a.gradeCategoryId);
    if (uncategorized.length > 0) {
      const percents = uncategorized
        .map((a) => entryPercent(a, entryFor(a, studentId)))
        .filter((p): p is number => p !== null);
      if (percents.length > 0) {
        const avg = percents.reduce((sum, p) => sum + p, 0) / percents.length;
        const w = Math.max(0, 100 - totalWeight); // whatever weight is left over
        if (w > 0) {
          weightedSum += avg * w;
          weightUsed += w;
        }
      }
    }

    return weightUsed > 0 ? Math.round(weightedSum / weightUsed) : null;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Gradebook</h1>

      <button onClick={() => setShowWeights((s) => !s)} className="btn-outline text-sm mb-4">
        {showWeights ? "Hide" : "Edit"} Grading Weights
      </button>

      {showWeights && (
        <div className="panel mb-4">
          <p className="text-sm text-slate-500 mb-2">
            Set how much each type of assignment counts toward the overall grade (as a
            percentage). {totalWeight !== 100 && (
              <span className="text-amber-600">Currently totals {totalWeight}%.</span>
            )}
          </p>
          <div className="space-y-2 mb-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-28 text-sm">{c.name}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightInputs[c.id] ?? ""}
                  onChange={(e) =>
                    setWeightInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-20 text-sm"
                />
                <span className="text-sm">%</span>
                <button onClick={() => saveWeight(c)} className="btn-outline text-xs">
                  Save
                </button>
                <button
                  onClick={() => removeCategory(c.id)}
                  className="text-rose-600 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <input
              placeholder="New category (e.g. Projects)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={newCategoryWeight}
              onChange={(e) => setNewCategoryWeight(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-20"
              placeholder="%"
            />
            <button onClick={addCategory} className="btn-primary text-sm">
              Add
            </button>
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setViewMode("combined")}
            className={`px-3 py-1 rounded text-sm ${viewMode === "combined" ? "btn-primary" : "bg-white border"}`}
          >
            Whole Class (combined)
          </button>
          <button
            onClick={() => setViewMode("byPeriod")}
            className={`px-3 py-1 rounded text-sm ${viewMode === "byPeriod" ? "btn-primary" : "bg-white border"}`}
          >
            By Period
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedSubjectId("all")}
          className={`px-3 py-1 rounded text-sm ${
            selectedSubjectId === "all" ? "btn-primary" : "bg-white border"
          }`}
        >
          All Subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSubjectId(s.id)}
            className={`px-3 py-1 rounded text-sm ${
              selectedSubjectId === s.id ? "btn-primary" : "bg-white border"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {(viewMode === "combined" ? visibleAssignments : assignments).length === 0 ? (
        <p className="text-slate-500">
          No assignments yet.{" "}
          <Link href="/homework" className="underline text-sky-600">
            Create one on the Assignments page
          </Link>{" "}
          to see it here.
        </p>
      ) : viewMode === "combined" ? (
        renderTable(visibleStudents, visibleAssignments)
      ) : (
        <div className="space-y-6">
          {sections.map((s) => {
            const sStudents = filterBySection(students, s.id);
            const sAssignments = assignmentsForSection(s.id);
            return (
              <div key={s.id}>
                <h2 className="font-semibold mb-2">{s.name}</h2>
                {sAssignments.length === 0 ? (
                  <p className="text-slate-400 text-sm">No assignments for this Period yet.</p>
                ) : (
                  renderTable(sStudents, sAssignments)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  function renderTable(rowStudents: Student[], colAssignments: Assignment[]) {
    // Group this table's assignments by grading category (Classwork/Homework/
    // Tests, or whatever's been configured) - anything with no category goes
    // in its own "Uncategorized" bucket, same grouping studentWeightedAverage
    // already uses internally for the overall grade.
    const groups: { key: string; label: string; assignments: Assignment[] }[] = [];
    categories.forEach((cat) => {
      const catAssignments = colAssignments.filter((a) => a.gradeCategoryId === cat.id);
      if (catAssignments.length > 0) groups.push({ key: cat.id, label: cat.name, assignments: catAssignments });
    });
    const uncategorized = colAssignments.filter((a) => !a.gradeCategoryId);
    if (uncategorized.length > 0) {
      groups.push({ key: "uncategorized", label: "Uncategorized", assignments: uncategorized });
    }

    function oneCategoryTable(label: string, catAssignments: Assignment[]) {
      return (
        <div key={label} className="mb-6">
          <h3 className="font-semibold text-sm mb-1">{label}</h3>
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-white sticky left-0">Student</th>
                {catAssignments.map((a) => (
                  <th key={a.id} className="border p-2 bg-white whitespace-nowrap">
                    <Link href={`/homework/${a.id}`} className="text-sky-600 hover:underline">
                      {a.name}
                    </Link>
                    <br />
                    <span className="text-xs text-slate-400">
                      Assigned {formatShortDate(a.assignedDate)}
                      {a.dueDate && (
                        <>
                          <br />
                          Due {formatShortDate(a.dueDate)}
                        </>
                      )}
                    </span>
                  </th>
                ))}
                <th className="border p-2 bg-sky-50 whitespace-nowrap">{label} Grade</th>
              </tr>
            </thead>
            <tbody>
              {rowStudents.map((student) => {
                const sectionAvg = categoryAverage(student.id, catAssignments);
                return (
                  <tr key={student.id}>
                    <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                      <Link href={`/students/${student.id}`} className="hover:underline">
                        {student.lastName}, {student.firstName}
                      </Link>
                    </td>
                    {catAssignments.map((a) => {
                      const entry = entryFor(a, student.id);
                      const { text, color } = cellDisplay(a, entry);
                      const tag = submissionTag(a, entry);
                      return (
                        <td key={a.id} className="border p-1 text-center">
                          <span
                            className="inline-block px-2 py-1 rounded text-xs whitespace-nowrap"
                            style={{ backgroundColor: color }}
                          >
                            {text}
                          </span>
                          {tag && (
                            <span
                              className="block text-[10px] mt-0.5 font-medium"
                              style={{ color: tag === "Missing" ? "#b91c1c" : "#b45309" }}
                            >
                              {tag}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border p-2 text-center font-medium bg-sky-50">
                      {sectionAvg !== null ? `${sectionAvg}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div>
        {groups.map((g) => oneCategoryTable(g.label, g.assignments))}
        {groups.length === 0 && <p className="text-slate-400 text-sm mb-4">No assignments here yet.</p>}

        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-white sticky left-0">Student</th>
              <th className="border p-2 bg-emerald-50 whitespace-nowrap">Overall Grade</th>
            </tr>
          </thead>
          <tbody>
            {rowStudents.map((student) => {
              const avg = studentWeightedAverage(student.id, colAssignments);
              return (
                <tr key={student.id}>
                  <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                    <Link href={`/students/${student.id}`} className="hover:underline">
                      {student.lastName}, {student.firstName}
                    </Link>
                  </td>
                  <td className="border p-2 text-center font-medium bg-emerald-50">
                    {avg !== null ? `${avg}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
