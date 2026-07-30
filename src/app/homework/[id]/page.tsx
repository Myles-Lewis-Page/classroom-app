"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useSectionContext } from "@/components/SectionContext";
import { effectiveGradePercent, daysLate } from "@/lib/grading";

type Entry = {
  status: string;
  submittedAt: string | null;
  gradeStatus: string | null;
  gradeScore: number | null;
  student: { id: string; firstName: string; lastName: string; sectionId: string | null };
};
type AssignmentDetail = {
  id: string;
  name: string;
  assignedDate: string;
  dueDate: string | null;
  gradingType: string;
  maxPoints: number | null;
  latePenaltyPercentPerDay: number | null;
  entries: Entry[];
};

const SUBMIT_LABEL: Record<string, string> = { missing: "Missing", handed_in: "Handed In" };
const SUBMIT_COLOR: Record<string, string> = { missing: "#e0e7ff", handed_in: "#bae6fd" };

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeSectionId } = useSectionContext();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    fetch(`/api/assignments/${id}`).then((r) => r.json()).then(setAssignment);
  }

  async function setSubmission(studentId: string, status: string) {
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId
                ? {
                    ...e,
                    status,
                    submittedAt: status === "handed_in" ? new Date().toISOString() : e.submittedAt,
                  }
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

  async function setGradeStatus(studentId: string, gradeStatus: string) {
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId ? { ...e, gradeStatus } : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, gradeStatus }),
    });
  }

  async function setGradeScore(studentId: string, gradeScore: string) {
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId
                ? { ...e, gradeScore: gradeScore === "" ? null : Number(gradeScore) }
                : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, gradeScore: gradeScore === "" ? null : gradeScore }),
    });
  }

  function isLate(entry: Entry): boolean {
    if (!assignment?.dueDate || !entry.submittedAt) return false;
    return new Date(entry.submittedAt) > new Date(assignment.dueDate);
  }

  const visibleEntries = useMemo(() => {
    if (!assignment) return [];
    if (!activeSectionId) return assignment.entries;
    return assignment.entries.filter((e) => e.student.sectionId === activeSectionId);
  }, [assignment, activeSectionId]);

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
        {" · "}
        {assignment.gradingType === "points"
          ? `Graded out of ${assignment.maxPoints}`
          : "Completion graded"}
        {!!assignment.latePenaltyPercentPerDay && ` · -${assignment.latePenaltyPercentPerDay}%/day late`}
      </p>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center text-sm font-medium text-slate-500 mb-1 px-1">
        <span>Student</span>
        <span>Submitted</span>
        <span>Grade</span>
      </div>

      <ul className="space-y-2">
        {visibleEntries.map((e) => {
          const late = isLate(e);
          return (
            <li
              key={e.student.id}
              className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center card py-2"
            >
              <span>
                {e.student.lastName}, {e.student.firstName}
                {e.status === "handed_in" && e.submittedAt && (
                  <span className="text-xs text-slate-500 block">
                    {new Date(e.submittedAt).toLocaleDateString()}
                    {late && <span className="text-rose-600 font-medium"> · Late</span>}
                  </span>
                )}
              </span>

              <select
                value={e.status}
                onChange={(ev) => setSubmission(e.student.id, ev.target.value)}
                className="px-2 py-1 rounded text-sm border"
                style={{ backgroundColor: SUBMIT_COLOR[e.status], color: "#1e293b" }}
              >
                {Object.entries(SUBMIT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {assignment.gradingType === "points" ? (
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={assignment.maxPoints ?? undefined}
                    value={e.gradeScore ?? ""}
                    onChange={(ev) => setGradeScore(e.student.id, ev.target.value)}
                    placeholder={`/ ${assignment.maxPoints}`}
                    className="w-20 px-2 py-1 rounded text-sm border"
                  />
                  {late && assignment.latePenaltyPercentPerDay && e.gradeScore !== null && (
                    <span className="text-xs text-amber-600">
                      → {effectiveGradePercent(assignment, e)}% ({daysLate(assignment, e)}d late)
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <select
                    value={e.gradeStatus ?? ""}
                    onChange={(ev) => setGradeStatus(e.student.id, ev.target.value)}
                    className="px-2 py-1 rounded text-sm border"
                    style={{
                      backgroundColor:
                        e.gradeStatus === "complete"
                          ? "#a7f3d0"
                          : e.gradeStatus === "incomplete"
                          ? "#fecaca"
                          : "#f5f3ff",
                      color: "#1e293b",
                    }}
                  >
                    <option value="">Not graded</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                  {late && assignment.latePenaltyPercentPerDay && e.gradeStatus === "complete" && (
                    <span className="text-xs text-amber-600">
                      → {effectiveGradePercent(assignment, e)}% ({daysLate(assignment, e)}d late)
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
