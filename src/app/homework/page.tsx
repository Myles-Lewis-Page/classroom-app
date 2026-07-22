"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Assignment = {
  id: string;
  name: string;
  date: string;
  entries: { status: string }[];
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [classroomId, setClassroomId] = useState("");
  const [classroomError, setClassroomError] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/classroom")
      .then((r) => {
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
      .catch(() => setClassroomError(true));
  }, []);

  function load() {
    fetch("/api/assignments").then((r) => r.json()).then(setAssignments);
  }

  async function createAssignment() {
    if (!name.trim() || !date) return;
    if (!classroomId) {
      alert("No classroom found for your account yet. Please contact support or re-run setup/seed.");
      return;
    }
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId, name: name.trim(), date }),
    });
    setName("");
    load();
  }

  function statusCounts(entries: { status: string }[]) {
    const counts = { complete: 0, incomplete: 0, needs_help: 0, missing: 0 };
    entries.forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    return counts;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Homework — Assignments</h1>

      <div className="panel mb-6">
        <h2 className="font-semibold mb-2">New Assignment</h2>
        {classroomError && (
          <p className="text-rose-600 text-sm mb-2">
            ⚠️ Couldn't find a classroom for your account. Creating assignments is disabled until
            this is resolved.
          </p>
        )}
        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="Assignment name (e.g. Reading Log Week 3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <button
            onClick={createAssignment}
            disabled={!classroomId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {assignments.map((a) => {
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
                  <p className="text-sm text-slate-500">{new Date(a.date).toLocaleDateString()}</p>
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
        {assignments.length === 0 && (
          <p className="text-slate-500">No assignments yet — create one above to get started.</p>
        )}
      </div>
    </div>
  );
}
