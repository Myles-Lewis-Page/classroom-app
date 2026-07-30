"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LineChart from "@/components/LineChart";
import { effectiveGradePercent } from "@/lib/grading";
import { formatShortDate } from "@/lib/dateOnly";

type SkillSubject = { id: string; name: string };
type GradeCategory = { id: string; name: string; weight: number };
type Entry = {
  status: string;
  submittedAt: string | null;
  gradeStatus: string | null;
  gradeScore: number | null;
};
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
  latePenaltyPercentPerDay: number | null;
  entries: Entry[];
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
  const [latePenalty, setLatePenalty] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [classroomError, setClassroomError] = useState(false);
  const [classroomLoading, setClassroomLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

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
        latePenaltyPercentPerDay: latePenalty || null,
      }),
    });
    setName("");
    setDueDate("");
    setLatePenalty("");
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

  // Grade distribution line chart: buckets every graded entry's effective
  // percent (late penalty already applied) into standard grade bands, so it
  // reads the same way regardless of whether the assignment is points- or
  // completion-graded.
  const GRADE_BANDS: { label: string; min: number; max: number }[] = [
    { label: "Below 60", min: 0, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-79", min: 70, max: 79 },
    { label: "80-89", min: 80, max: 89 },
    { label: "90-100", min: 90, max: 100 },
  ];
  function gradeDistributionPoints(a: Assignment) {
    const percents = a.entries
      .map((e) => effectiveGradePercent(a, e))
      .filter((p): p is number => p !== null);
    if (percents.length === 0) return [];
    return GRADE_BANDS.map((band) => ({
      label: band.label,
      value: percents.filter((p) => p >= band.min && p <= band.max).length,
    }));
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
          <div>
            <label className="block text-xs text-slate-500">Late penalty (optional)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={latePenalty}
                onChange={(e) => setLatePenalty(e.target.value)}
                placeholder="0"
                className="border rounded px-2 py-1 w-16"
              />
              <span className="text-xs text-slate-500">% off/day late</span>
            </div>
          </div>
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
          const gradedPercents = a.entries
            .map((e) => effectiveGradePercent(a, e))
            .filter((p): p is number => p !== null);
          const avgGrade =
            gradedPercents.length > 0
              ? Math.round(gradedPercents.reduce((sum, p) => sum + p, 0) / gradedPercents.length)
              : null;

          return (
            <div key={a.id} className="card flex gap-4 items-start justify-between flex-wrap">
              <Link href={`/homework/${a.id}`} className="flex-1 min-w-[220px] hover:opacity-80">
                <h3 className="font-bold">{a.name}</h3>
                <p className="text-sm text-slate-500 mb-2">
                  {a.gradeCategory && `${a.gradeCategory.name} · `}
                  Assigned {formatShortDate(a.assignedDate)}
                  {a.dueDate && ` · Due ${formatShortDate(a.dueDate)}`}
                  {" · "}
                  {a.gradingType === "points" ? `Graded out of ${a.maxPoints}` : "Completion graded"}
                  {!!a.latePenaltyPercentPerDay && ` · -${a.latePenaltyPercentPerDay}%/day late`}
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
                  <span>Class average grade: {avgGrade !== null ? `${avgGrade}%` : "not graded yet"}</span>
                  {a.gradingType === "completion" && (
                    <>
                      <span>{gradeComplete} complete</span>
                      <span>{gradeIncomplete} incomplete</span>
                    </>
                  )}
                </div>
              </Link>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingAssignment(a)}
                    className="text-sky-600 text-xs hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeAssignment(a.id, a.name)}
                    className="text-rose-600 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <p className="text-xs text-slate-400 text-center mb-1">Grade Distribution</p>
                  <LineChart points={gradeDistributionPoints(a)} width={180} height={70} color="#7dd3fc" />
                </div>
              </div>
            </div>
          );
        })}
        {visibleAssignments.length === 0 && (
          <p className="text-slate-500">No assignments yet — create one above to get started.</p>
        )}
      </div>

      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          subjects={subjects}
          categories={categories}
          onClose={() => setEditingAssignment(null)}
          onSaved={() => {
            setEditingAssignment(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditAssignmentModal({
  assignment,
  subjects,
  categories,
  onClose,
  onSaved,
}: {
  assignment: Assignment;
  subjects: SkillSubject[];
  categories: GradeCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(assignment.name);
  const [subjectId, setSubjectId] = useState(assignment.skillSubjectId ?? "");
  const [categoryId, setCategoryId] = useState(assignment.gradeCategoryId ?? "");
  const [assignedDate, setAssignedDate] = useState(assignment.assignedDate.slice(0, 10));
  const [dueDate, setDueDate] = useState(assignment.dueDate ? assignment.dueDate.slice(0, 10) : "");
  const [gradingType, setGradingType] = useState(assignment.gradingType);
  const [maxPoints, setMaxPoints] = useState(String(assignment.maxPoints ?? 100));
  const [latePenalty, setLatePenalty] = useState(
    assignment.latePenaltyPercentPerDay != null ? String(assignment.latePenaltyPercentPerDay) : ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !assignedDate) return;
    setSaving(true);
    await fetch(`/api/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        assignedDate,
        dueDate: dueDate || null,
        subjectId: subjectId || null,
        gradeCategoryId: categoryId || null,
        gradingType,
        maxPoints: gradingType === "points" ? maxPoints : null,
        latePenaltyPercentPerDay: latePenalty || null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Edit Assignment</h3>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            autoFocus
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">No type</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.weight}%)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Assigned</label>
            <input
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Due (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Grading</label>
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
              <label className="block text-xs text-slate-500 mb-1">Out of</label>
              <input
                type="number"
                min={1}
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Late penalty</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={latePenalty}
                onChange={(e) => setLatePenalty(e.target.value)}
                placeholder="0"
                className="border rounded px-2 py-1 w-16"
              />
              <span className="text-xs text-slate-500">%/day late</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-outline text-sm">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
