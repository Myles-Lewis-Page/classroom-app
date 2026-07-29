"use client";

import { useEffect, useState, useMemo } from "react";
import ParentContactRotationWidget from "@/components/ParentContactRotationWidget";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

type Student = { id: string; firstName: string; lastName: string; sectionId: string | null };
type ContactLog = {
  id: string;
  date: string;
  reason: string;
  method: string;
  comment: string | null;
  followUp: boolean;
  student: { firstName: string; lastName: string };
};

const REASON_OPTIONS = [
  { value: "behavior", label: "Behavior concern" },
  { value: "skill", label: "Skill / academic update" },
  { value: "positive", label: "Something they did really well" },
  { value: "other", label: "Other" },
];
const METHOD_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
];

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REASON_OPTIONS.map((r) => [r.value, r.label])
);
const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  METHOD_OPTIONS.map((r) => [r.value, r.label])
);

export default function ParentLogPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [filterStudentId, setFilterStudentId] = useState("");

  // New row (spreadsheet-style single-row entry form)
  const [newStudentId, setNewStudentId] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newReason, setNewReason] = useState("behavior");
  const [newMethod, setNewMethod] = useState("phone");
  const [newComment, setNewComment] = useState("");
  const [newFollowUp, setNewFollowUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    load();
  }, []);

  useEffect(() => {
    load();
  }, [filterStudentId]);

  function load() {
    const url = filterStudentId
      ? `/api/parent-contact-log?studentId=${filterStudentId}`
      : "/api/parent-contact-log";
    fetch(url).then((r) => r.json()).then(setLogs);
  }

  async function toggleFollowUp(log: ContactLog) {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, followUp: !l.followUp } : l)));
    await fetch("/api/parent-contact-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: log.id, followUp: !log.followUp }),
    });
  }

  async function addRow() {
    if (!newStudentId) return;
    setSaving(true);
    await fetch("/api/parent-contact-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: newStudentId,
        date: newDate,
        reason: newReason,
        method: newMethod,
        comment: newComment,
        followUp: newFollowUp,
      }),
    });
    setSaving(false);
    setNewStudentId("");
    setNewComment("");
    setNewFollowUp(false);
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Parent Contact Log</h1>
        <button onClick={() => window.print()} className="btn-outline text-sm print:hidden">
          Print
        </button>
      </div>

      <div className="mb-6">
        <ParentContactRotationWidget />
      </div>

      <h2 className="font-semibold mb-2">Log a Contact</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left bg-violet-50/60">
              <th className="border p-2">Student</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Reason</th>
              <th className="border p-2">Contacted via</th>
              <th className="border p-2">Comments / important info</th>
              <th className="border p-2">Follow up?</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1">
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="">Select...</option>
                  {visibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td className="border p-1">
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <input
                  placeholder="Notes..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td className="border p-1 text-center">
                <input
                  type="checkbox"
                  checked={newFollowUp}
                  onChange={(e) => setNewFollowUp(e.target.checked)}
                />
              </td>
              <td className="border p-1 text-center">
                <button
                  onClick={addRow}
                  disabled={saving || !newStudentId}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {saving ? "..." : "Add"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">History</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={showFollowUpOnly}
              onChange={(e) => setShowFollowUpOnly(e.target.checked)}
            />
            Needs follow up only
          </label>
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All students</option>
            {visibleStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1">Student</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Method</th>
              <th>Comments</th>
              <th>Follow up?</th>
            </tr>
          </thead>
          <tbody>
            {logs
              .filter((log) => !showFollowUpOnly || log.followUp)
              .map((log) => (
                <tr key={log.id} className="border-b align-top">
                  <td className="py-2 whitespace-nowrap">
                    {log.student.firstName} {log.student.lastName}
                  </td>
                  <td className="py-2 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                  <td className="py-2 whitespace-nowrap">{REASON_LABEL[log.reason] ?? log.reason}</td>
                  <td className="py-2 whitespace-nowrap">{METHOD_LABEL[log.method] ?? log.method}</td>
                  <td className="py-2">{log.comment}</td>
                  <td className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={log.followUp}
                      onChange={() => toggleFollowUp(log)}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-slate-500 mt-2">No contacts logged yet.</p>}
      </div>
    </div>
  );
}
