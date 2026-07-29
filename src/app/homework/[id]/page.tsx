"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Entry = {
  status: string;
  submittedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
};
type AssignmentDetail = {
  id: string;
  name: string;
  assignedDate: string;
  dueDate: string | null;
  entries: Entry[];
};

const STATUS_OPTIONS = ["missing", "complete", "incomplete", "needs_help", "handed_in"] as const;
const STATUS_LABEL: Record<string, string> = {
  missing: "Missing",
  complete: "Complete",
  incomplete: "Incomplete",
  needs_help: "Needs Help",
  handed_in: "Handed In",
};
const STATUS_COLOR: Record<string, string> = {
  missing: "#e0e7ff",
  complete: "#a7f3d0",
  incomplete: "#fecaca",
  needs_help: "#fde68a",
  handed_in: "#bae6fd",
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

  async function setStatus(studentId: string, status: string) {
    // optimistic update
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId
                ? { ...e, status, submittedAt: status === "handed_in" ? new Date().toISOString() : e.submittedAt }
                : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, status }),
    });
    load();
  }

  function isLate(entry: Entry): boolean {
    if (!assignment?.dueDate || !entry.submittedAt) return false;
    return new Date(entry.submittedAt) > new Date(assignment.dueDate);
  }

  if (!assignment) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/homework" className="text-sky-600 text-sm hover:underline">
        ← Back to Assignments
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{assignment.name}</h1>
      <p className="text-slate-500 mb-4">
        Assigned {new Date(assignment.assignedDate).toLocaleDateString()}
        {assignment.dueDate && ` · Due ${new Date(assignment.dueDate).toLocaleDateString()}`}
      </p>

      <p className="text-sm text-slate-500 mb-2">
        Set each student's status - "Handed In" records the date/time and flags it Late
        automatically if it's after the due date.
      </p>

      <ul className="space-y-2">
        {assignment.entries.map((e) => {
          const late = isLate(e);
          return (
            <li key={e.student.id} className="flex items-center justify-between card py-2">
              <span>
                {e.student.lastName}, {e.student.firstName}
                {e.status === "handed_in" && e.submittedAt && (
                  <span className="text-xs text-slate-500 ml-2">
                    ({new Date(e.submittedAt).toLocaleDateString()}
                    {late && <span className="text-rose-600 font-medium"> · Late</span>})
                  </span>
                )}
              </span>
              <select
                value={e.status}
                onChange={(ev) => setStatus(e.student.id, ev.target.value)}
                className="px-2 py-1 rounded text-sm border"
                style={{ backgroundColor: STATUS_COLOR[e.status], color: "#1e293b" }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
