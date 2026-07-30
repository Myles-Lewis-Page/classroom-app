"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LineChart from "@/components/LineChart";

type SkillSubject = { id: string; name: string };
type GradeCategory = { id: string; name: string; weight: number };
type Assignment = {
  id: string;
  name: string;
  assignedDate: string;
  dueDate: string | null;
  skillSubjectId: string | null;
  gradeCategoryId: string | null;
  gradeCategory: { name: string } | null;
  gradingType: string;
  maxPoints: number | null;
  entries: { status: string; gradeStatus: string | null; gradeScore: number | null }[];
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [name, setName] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [gradingType, setGradingType] = useState("completion");
  const [maxPoints, setMaxPoints] = useState("100");
  const [classroomId, setClassroomId] = useState("");
  const [classroomError, setClassroomError] = useState(false);
  const [classroomLoading, setClassroomLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState(false);

  useEffect(() => {
    load();
    loadClassroom();
    fetch("/api/skill-subjects").then((r) => r.json()).then(setSubjects);
    fetch("/api/grade-categories").then((r) => r.json()).then(setCategories);
  }, []);

  function loadClassroom() {
    setClassroomLoading(true);
    setClassroomError(false);
    setAuthIssue(false);
    fetch("/api/classroom")
      .then((r) => {
        if (r.status === 401) {
          setAuthIssue(true);
          throw new Error("unauthorized");
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((c) => {
        if (!c?.id) {
          setClassroomError(true);
          return;
        }
        setClassroomId(c.id);
      })
      .catch(() => setClassroomError(true))
      .finally(() => setClassroomLoading(false));
  }

  function load() {
    fetch("/api/assignments").then((r) => r.json()).then(setAssignments);
  }

  async function createAssignment() {
    if (!name.trim() || !assignedDate) return;
    if (!classroomId) {
      alert("No classroom found for your account yet. Please contact support or re-run setup/seed.");
      return;
    }
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        assignedDate,
        dueDate: dueDate || null,
        subjectId: newSubjectId || null,
        gradeCategoryId: newCategoryId || null,
        gradingType,
        maxPoints: gradingType === "points" ? maxPoints : null,
      }),
    });
    setName("");
    setDueDate("");
    load();
  }

  async function removeAssignment(id: string, assignmentName: string) {
    if (
      !confirm(
        `Delete "${assignmentName}"? This removes it and every student's grade/submission status for it - this can't be undone.`
      )
    )
      return;
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    load();
  }

  function statusCounts(entries: { status: string }[]) {
    const counts = { handed_in: 0, missing: 0 };
    entries.forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    return counts;
  }

  // Distribution line chart data: score-by-score counts for points-graded
  // assignments, or a simple Incomplete/Complete pair for completion-graded.
  function distributionPoints(a: Assignment) {
    if (a.gradingType === "points") {
      const byScore = new Map<number, number>();
      a.entries.forEach((e) => {
        if (e.gradeScore !== null) byScore.set(e.gradeScore, (byScore.get(e.gradeScore) ?? 0) + 1);
      });
      return Array.from(byScore.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([score, count]) => ({ label: `${score}/${a.maxPoints}`, value: count }));
    }
    const complete = a.entries.filter((e) => e.gradeStatus === "complete").length;
    const incomplete = a.entries.filter((e) => e.gradeStatus === "incomplete").length;
    if (complete === 0 && incomplete === 0) return [];
    return [
      { label: "Incomplete (0%)", value: incomplete },
      { label: "Complete (100%)", value: complete },
    ];
  }

  const visibleAssignments =
    selectedSubjectId === "all"
      ? assignments
      : assignments.filter((a) => a.skillSubjectId === selectedSubjectId);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Assignments</h1>

      <div className="panel mb-6">
        <h2 className="font-semibold mb-2">New Assignment</h2>
        {classroomError && !classroomLoading && authIssue && (
          <p className="text-rose-600 text-sm mb-2">
            ⚠️ Your session may have expired.{" "}
            <a href="/login" className="underline font-medium">
              Log in again
            </a>
            , or{" "}
            <button onClick={loadClassroom} className="underline font-medium">
              try reloading
            </button>
            .
          </p>
        )}
        {classroomError && !classroomLoading && !authIssue && (
          <p className="text-rose-600 text-sm mb-2">
            ⚠️ You don't have a classroom set up yet.{" "}
            <Link href="/profile" className="underline font-medium">
              Set up your profile
            </Link>{" "}
            to create one, or{" "}
            <button onClick={loadClassroom} className="underline font-medium">
              try reloading
            </button>{" "}
            if you know one already exists.
          </p>
        )}
        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="Assignment name (e.g. Reading Log Week 3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <select
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">No type</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.weight}%)
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-slate-500">Assigned</label>
            <input
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Due (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Grading</label>
            <select
              value={gradingType}
              onChange={(e) => setGradingType(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="completion">Completion (Complete/Incomplete)</option>
              <option value="points">Points (grade out of X)</option>
            </select>
          </div>
          {gradingType === "points" && (
            <div>
              <label className="block text-xs text-slate-500">Out of</label>
              <input
                type="number"
                min={1}
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
          )}
          <button
            onClick={createAssignment}
            disabled={!classroomId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>

      {/* Subject tabs, like Skills */}
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

      <div className="space-y-3">
        {visibleAssignments.map((a) => {
          const counts = statusCounts(a.entries);
          const total = a.entries.length || 1;
          const segments = [
            { key: "handed_in", color: "#bae6fd", count: counts.handed_in },
            { key: "missing", color: "#e0e7ff", count: counts.missing },
          ];

          const gradeComplete = a.entries.filter((e) => e.gradeStatus === "complete").length;
          const gradeIncomplete = a.entries.filter((e) => e.gradeStatus === "incomplete").length;
          const scored = a.entries.filter((e) => e.gradeScore !== null);
          const avgScore =
            scored.length > 0
              ? Math.round(scored.reduce((sum, e) => sum + (e.gradeScore ?? 0), 0) / scored.length)
              : null;

          return (
            <div key={a.id} className="card flex gap-4 items-start justify-between flex-wrap">
              <Link href={`/homework/${a.id}`} className="flex-1 min-w-[220px] hover:opacity-80">
                <h3 className="font-bold">{a.name}</h3>
                <p className="text-sm text-slate-500 mb-2">
                  {a.gradeCategory && `${a.gradeCategory.name} · `}
                  Assigned {new Date(a.assignedDate).toLocaleDateString()}
                  {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString()}`}
                  {" · "}
                  {a.gradingType === "points" ? `Graded out of ${a.maxPoints}` : "Completion graded"}
                </p>

                <p className="text-xs text-slate-500 mb-1">Submitted</p>
                <div className="flex h-4 rounded overflow-hidden border mb-2">
                  {segments.map(
                    (seg) =>
                      seg.count > 0 && (
                        <div
                          key={seg.key}
                          style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
                          title={`${seg.key}: ${seg.count}`}
                        />
                      )
                  )}
                </div>
                <div className="flex gap-3 flex-wrap text-xs text-slate-600 mb-2">
                  <span>{counts.handed_in} handed in</span>
                  <span>{counts.missing} missing</span>
                </div>

                <p className="text-xs text-slate-500 mb-1">Grading</p>
                <div className="flex gap-3 flex-wrap text-xs text-slate-600">
                  {a.gradingType === "points" ? (
                    <span>
                      Class average: {avgScore !== null ? `${avgScore}/${a.maxPoints}` : "not graded yet"}
                    </span>
                  ) : (
                    <>
                      <span>{gradeComplete} complete</span>
                      <span>{gradeIncomplete} incomplete</span>
                    </>
                  )}
                </div>
              </Link>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  onClick={() => removeAssignment(a.id, a.name)}
                  className="text-rose-600 text-xs hover:underline"
                >
                  Remove
                </button>
                <div>
                  <p className="text-xs text-slate-400 text-center mb-1">Distribution</p>
                  <LineChart
                    points={distributionPoints(a)}
                    width={180}
                    height={70}
                    color={a.gradingType === "points" ? "#7dd3fc" : "#a7f3d0"}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {visibleAssignments.length === 0 && (
          <p className="text-slate-500">No assignments yet — create one above to get started.</p>
        )}
      </div>
    </div>
  );
}
