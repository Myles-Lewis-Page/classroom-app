"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SkillSubject = { id: string; name: string };
type Assignment = {
  id: string;
  name: string;
  assignedDate: string;
  dueDate: string | null;
  skillSubjectId: string | null;
  entries: { status: string }[];
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [name, setName] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [classroomError, setClassroomError] = useState(false);
  const [classroomLoading, setClassroomLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState(false);

  useEffect(() => {
    load();
    loadClassroom();
    fetch("/api/skill-subjects").then((r) => r.json()).then(setSubjects);
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
      }),
    });
    setName("");
    setDueDate("");
    load();
  }

  function statusCounts(entries: { status: string }[]) {
    const counts = { complete: 0, incomplete: 0, needs_help: 0, missing: 0 };
    entries.forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    return counts;
  }

  const visibleAssignments =
    selectedSubjectId === "all"
      ? assignments
      : assignments.filter((a) => a.skillSubjectId === selectedSubjectId);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Homework — Assignments</h1>

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
          return (
            <Link
              key={a.id}
              href={`/homework/${a.id}`}
              className="card block hover:bg-violet-50/40 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{a.name}</h3>
                  <p className="text-sm text-slate-500">
                    Assigned {new Date(a.assignedDate).toLocaleDateString()}
                    {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-xs text-slate-600 text-right space-y-0.5">
                  <p>✅ {counts.complete} complete</p>
                  <p>⚠️ {counts.needs_help} needs help</p>
                  <p>❌ {counts.incomplete} incomplete</p>
                  <p>❓ {counts.missing} missing</p>
                </div>
              </div>
            </Link>
          );
        })}
        {visibleAssignments.length === 0 && (
          <p className="text-slate-500">No assignments yet — create one above to get started.</p>
        )}
      </div>
    </div>
  );
}
