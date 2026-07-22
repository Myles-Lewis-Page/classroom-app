"use client";

import { useEffect, useState } from "react";

type Student = { id: string; firstName: string; lastName: string };
type ContactLog = {
  id: string;
  date: string;
  reason: string;
  comment: string | null;
  student: { firstName: string; lastName: string };
};

const REASON_OPTIONS = [
  { value: "behavior", label: "Behavior concern" },
  { value: "skill", label: "Skill / academic update" },
  { value: "positive", label: "Something they did really well" },
  { value: "other", label: "Other" },
];

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REASON_OPTIONS.map((r) => [r.value, r.label])
);

export default function ParentLogPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("behavior");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setSaving(true);
    await fetch("/api/parent-contact-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, date, reason, comment }),
    });
    setSaving(false);
    setComment("");
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Parent Contact Log</h1>

      <form onSubmit={handleSubmit} className="card space-y-3 mb-6">
        <h2 className="font-semibold">Log a Contact</h2>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="border rounded px-2 py-1"
            required
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Reason for contact</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          >
            {REASON_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="Comment / notes about the conversation..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          rows={3}
        />
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Log Contact"}
        </button>
      </form>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">History</h2>
        <select
          value={filterStudentId}
          onChange={(e) => setFilterStudentId(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.lastName}, {s.firstName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {log.student.firstName} {log.student.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(log.date).toLocaleDateString()} · {REASON_LABEL[log.reason] ?? log.reason}
                </p>
              </div>
            </div>
            {log.comment && <p className="text-sm mt-1">{log.comment}</p>}
          </div>
        ))}
        {logs.length === 0 && <p className="text-slate-500">No contacts logged yet.</p>}
      </div>
    </div>
  );
}
