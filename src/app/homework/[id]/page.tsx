"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useSectionContext } from "@/components/SectionContext";
import GradeHistogram from "@/components/GradeHistogram";
import { effectiveGradePercent, daysLate } from "@/lib/grading";
import { formatShortDate, todayLocalDateString, parseDateOnly, toDateInputValue } from "@/lib/dateOnly";

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

const SUBMIT_LABEL: Record<string, string> = { missing: "Missing", handed_in: "Handed In", exempt: "Exempt" };
const SUBMIT_COLOR: Record<string, string> = { missing: "#e0e7ff", handed_in: "#bae6fd", exempt: "#e2e8f0" };

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { sections } = useSectionContext();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [histogramMode, setHistogramMode] = useState<"all" | "byPeriod">("all");

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    fetch(`/api/assignments/${id}`).then((r) => r.json()).then(setAssignment);
  }

  async function setSubmission(studentId: string, status: string) {
    // Captured once so the optimistic UI update and the actual request use
    // the exact same value - this is the teacher's real local calendar
    // date, not the server's, which is what "late" needs to be compared
    // against (the due date is a calendar date with no time-of-day, so
    // comparing it to a precise server timestamp is what caused submissions
    // made later in the day, or from a server in a different timezone, to
    // wrongly show as a day or more late even when handed in on time).
    const submittedDate = todayLocalDateString();

    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId
                ? {
                    ...e,
                    status,
                    submittedAt: status === "handed_in" ? parseDateOnly(submittedDate).toISOString() : e.submittedAt,
                  }
                : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, status, submittedDate }),
    });
    load();
  }

  // Lets the teacher correct the hand-in date directly - e.g. logging a
  // submission a couple days after the fact shouldn't leave it stamped with
  // today's date. Reuses the same status endpoint since submittedDate is
  // already the single source of truth for submittedAt there.
  async function editSubmittedDate(studentId: string, submittedDate: string) {
    setAssignment((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.student.id === studentId
                ? { ...e, submittedAt: parseDateOnly(submittedDate).toISOString() }
                : e
            ),
          }
        : prev
    );
    await fetch(`/api/assignments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, status: "handed_in", submittedDate }),
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

  if (!assignment) return <div className="p-6">Loading...</div>;

  function entryList(entries: Entry[]) {
    return (
      <>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center text-sm font-medium text-slate-500 mb-1 px-1">
          <span>Student</span>
          <span>Submitted</span>
          <span>Grade</span>
        </div>
        <ul className="space-y-2 mb-6">
          {entries.map((e) => {
            const late = isLate(e);
            return (
              <li
                key={e.student.id}
                className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center card py-2"
              >
                <span>
                  {e.student.lastName}, {e.student.firstName}
                  {e.status === "handed_in" && e.submittedAt && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <input
                        type="date"
                        value={toDateInputValue(e.submittedAt)}
                        onChange={(ev) => editSubmittedDate(e.student.id, ev.target.value)}
                        className="border rounded px-1 py-0.5 text-xs"
                        title="Edit the date this was actually handed in"
                      />
                      {late && <span className="text-rose-600 font-medium">Late</span>}
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

                {assignment!.gradingType === "points" ? (
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={assignment!.maxPoints ?? undefined}
                      value={e.gradeScore ?? ""}
                      onChange={(ev) => setGradeScore(e.student.id, ev.target.value)}
                      placeholder={e.status === "exempt" ? "Exempt" : `/ ${assignment!.maxPoints}`}
                      disabled={e.status === "exempt"}
                      className="w-20 px-2 py-1 rounded text-sm border disabled:opacity-50 disabled:bg-slate-100"
                    />
                    {late && assignment!.latePenaltyPercentPerDay && e.gradeScore !== null && (
                      <span className="text-xs text-amber-600">
                        → {effectiveGradePercent(assignment!, e)}% ({daysLate(assignment!, e)}d late)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <select
                      value={e.gradeStatus ?? ""}
                      onChange={(ev) => setGradeStatus(e.student.id, ev.target.value)}
                      disabled={e.status === "exempt"}
                      className="px-2 py-1 rounded text-sm border disabled:opacity-50 disabled:bg-slate-100"
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
                    {late && assignment!.latePenaltyPercentPerDay && e.gradeStatus === "complete" && (
                      <span className="text-xs text-amber-600">
                        → {effectiveGradePercent(assignment!, e)}% ({daysLate(assignment!, e)}d late)
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/homework" className="text-sky-600 text-sm hover:underline">
        ← Back to Assignments
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{assignment.name}</h1>
      <p className="text-slate-500 mb-4">
        Assigned {formatShortDate(assignment.assignedDate)}
        {assignment.dueDate && ` · Due ${formatShortDate(assignment.dueDate)}`}
        {" · "}
        {assignment.gradingType === "points"
          ? `Graded out of ${assignment.maxPoints}`
          : "Completion graded"}
        {!!assignment.latePenaltyPercentPerDay && ` · -${assignment.latePenaltyPercentPerDay}%/day late`}
      </p>

      {sections.length > 0 && (
        <div className="panel mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Grade Distribution</h2>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setHistogramMode("all")}
                className={`px-2 py-1 rounded ${histogramMode === "all" ? "btn-primary" : "bg-white border"}`}
              >
                All Periods
              </button>
              <button
                onClick={() => setHistogramMode("byPeriod")}
                className={`px-2 py-1 rounded ${histogramMode === "byPeriod" ? "btn-primary" : "bg-white border"}`}
              >
                By Period
              </button>
            </div>
          </div>
          {histogramMode === "all" ? (
            <GradeHistogram
              values={assignment.entries
                .map((e) => effectiveGradePercent(assignment, e))
                .filter((p): p is number => p !== null)}
              width={400}
              height={140}
            />
          ) : (
            <div className="flex flex-wrap gap-4">
              {sections.map((s) => {
                const vals = assignment.entries
                  .filter((e) => e.student.sectionId === s.id)
                  .map((e) => effectiveGradePercent(assignment, e))
                  .filter((p): p is number => p !== null);
                return (
                  <div key={s.id}>
                    <p className="text-xs text-slate-500 text-center mb-1">{s.name}</p>
                    <GradeHistogram values={vals} width={190} height={120} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {histogramMode === "all" ? (
        entryList(assignment.entries)
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.id}>
              <h2 className="font-semibold mb-2">{s.name}</h2>
              {entryList(assignment.entries.filter((e) => e.student.sectionId === s.id))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
