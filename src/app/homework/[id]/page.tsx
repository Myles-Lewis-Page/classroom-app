"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Entry = {
  status: string;
  student: { id: string; firstName: string; lastName: string };
};
type AssignmentDetail = {
  id: string;
  name: string;
  date: string;
  entries: Entry[];
};

const STATUS_CYCLE = ["missing", "complete", "incomplete", "needs_help"] as const;
const STATUS_LABEL: Record<string, string> = {
  missing: "Missing",
  complete: "Complete",
  incomplete: "Incomplete",
  needs_help: "Needs Help",
};
const STATUS_COLOR: Record<string, string> = {
  missing: "#e0e7ff",
  complete: "#a7f3d0",
  incomplete: "#fecaca",
  needs_help: "#fde68a",
};

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    fetch(`/api/assignments/${id}`).then((r) => r.json()).then(setAssignment);
  }

  async function cycle(studentId: string, current: string) {
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]) + 1) % 4];
    // optimistic update
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId ? { ...e, status: next } : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, status: next }),
    });
  }

  if (!assignment) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/homework" className="text-sky-600 text-sm hover:underline">
        ← Back to Assignments
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{assignment.name}</h1>
      <p className="text-slate-500 mb-4">{new Date(assignment.date).toLocaleDateString()}</p>

      <p className="text-sm text-slate-500 mb-2">
        Tap a student's status to cycle: Missing → Complete → Incomplete → Needs Help
      </p>

      <ul className="space-y-2">
        {assignment.entries.map((e) => (
          <li key={e.student.id} className="flex items-center justify-between card py-2">
            <span>
              {e.student.lastName}, {e.student.firstName}
            </span>
            <button
              onClick={() => cycle(e.student.id, e.status)}
              className="px-3 py-1 rounded text-sm"
              style={{ backgroundColor: STATUS_COLOR[e.status], color: "#1e293b" }}
            >
              {STATUS_LABEL[e.status]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
