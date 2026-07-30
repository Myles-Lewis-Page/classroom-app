"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

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
  skillSubjectId: string | null;
  gradeCategoryId: string | null;
  entries: Entry[];
};

export default function GradebookPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [showWeights, setShowWeights] = useState(false);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryWeight, setNewCategoryWeight] = useState("0");

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    fetch("/api/skill-subjects").then((r) => r.json()).then(setSubjects);
    loadCategories();
    fetch("/api/assignments").then((r) => r.json()).then(setAssignments);
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

  const visibleAssignments =
    selectedSubjectId === "all"
      ? assignments
      : assignments.filter((a) => a.skillSubjectId === selectedSubjectId);

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
    if (assignment.gradingType === "points") {
      if (entry.gradeScore === null) return { text: "—", color: "#f5f3ff" };
      const pct = assignment.maxPoints ? entry.gradeScore / assignment.maxPoints : 0;
      const color = pct >= 0.9 ? "#a7f3d0" : pct >= 0.7 ? "#fde68a" : "#fecaca";
      return { text: `${entry.gradeScore}/${assignment.maxPoints}`, color };
    }
    if (entry.gradeStatus === "complete") return { text: "Complete (100%)", color: "#a7f3d0" };
    if (entry.gradeStatus === "incomplete") return { text: "Incomplete (0%)", color: "#fecaca" };
    return { text: "Not graded", color: "#f5f3ff" };
  }

  // Percent earned (0-100) for one assignment/student, or null if ungraded.
  function entryPercent(assignment: Assignment, entry: Entry | undefined): number | null {
    if (!entry) return null;
    if (assignment.gradingType === "points") {
      if (entry.gradeScore === null || !assignment.maxPoints) return null;
      return (entry.gradeScore / assignment.maxPoints) * 100;
    }
    if (entry.gradeStatus === "complete") return 100;
    if (entry.gradeStatus === "incomplete") return 0;
    return null;
  }

  // Weighted overall grade: average % within each category, then combine
  // using that category's weight, normalized against only the categories
  // that actually have graded work (so missing categories don't distort it).
  function studentWeightedAverage(studentId: string): number | null {
    let weightedSum = 0;
    let weightUsed = 0;

    categories.forEach((cat) => {
      const catAssignments = visibleAssignments.filter((a) => a.gradeCategoryId === cat.id);
      const percents = catAssignments
        .map((a) => entryPercent(a, entryFor(a, studentId)))
        .filter((p): p is number => p !== null);
      if (percents.length === 0) return;
      const catAvg = percents.reduce((sum, p) => sum + p, 0) / percents.length;
      weightedSum += catAvg * cat.weight;
      weightUsed += cat.weight;
    });

    // Uncategorized assignments count as their own equal-weight bucket
    const uncategorized = visibleAssignments.filter((a) => !a.gradeCategoryId);
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

      {visibleAssignments.length === 0 ? (
        <p className="text-slate-500">
          No assignments yet.{" "}
          <Link href="/homework" className="underline text-sky-600">
            Create one on the Assignments page
          </Link>{" "}
          to see it here.
        </p>
      ) : (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-white sticky left-0">Student</th>
              {visibleAssignments.map((a) => (
                <th key={a.id} className="border p-2 bg-white whitespace-nowrap">
                  <Link href={`/homework/${a.id}`} className="text-sky-600 hover:underline">
                    {a.name}
                  </Link>
                  <br />
                  <span className="text-xs text-slate-400">
                    Assigned {new Date(a.assignedDate).toLocaleDateString()}
                    {a.dueDate && (
                      <>
                        <br />
                        Due {new Date(a.dueDate).toLocaleDateString()}
                      </>
                    )}
                  </span>
                </th>
              ))}
              <th className="border p-2 bg-white whitespace-nowrap">Overall Grade</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const avg = studentWeightedAverage(student.id);
              return (
                <tr key={student.id}>
                  <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                    <Link href={`/students/${student.id}`} className="hover:underline">
                      {student.lastName}, {student.firstName}
                    </Link>
                  </td>
                  {visibleAssignments.map((a) => {
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
                  <td className="border p-2 text-center font-medium">
                    {avg !== null ? `${avg}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
