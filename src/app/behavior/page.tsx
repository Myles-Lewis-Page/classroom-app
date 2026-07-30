"use client";

import { useEffect, useMemo, useState } from "react";
import ParentContactRotationWidget from "@/components/ParentContactRotationWidget";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

type Student = { id: string; firstName: string; lastName: string; sectionId: string | null };
type Subject = { id: string; name: string; icon: string | null; order: number };
type ContactLog = {
  id: string;
  date: string;
  reason: string;
  method: string;
  comment: string | null;
  followUp: boolean;
};
type BehaviorNote = {
  id: string;
  date: string;
  type: "good" | "bad";
  tag: string;
  note: string | null;
  subject: { id: string; name: string } | null;
  student: { id: string; firstName: string; lastName: string };
  contactLog: ContactLog | null;
};
type FullContactLog = ContactLog & { student: { firstName: string; lastName: string } };

const GOOD_TAGS = [
  "Great participation",
  "Kind to a classmate",
  "Followed directions well",
  "Helped a peer",
  "Excellent effort",
  "Stayed on task",
];
const BAD_TAGS = [
  "Talking out of turn",
  "Not following directions",
  "Off task",
  "Unkind words",
  "Disrupting class",
  "Incomplete work",
];

const REASON_OPTIONS = [
  { value: "behavior", label: "Behavior concern" },
  { value: "skill", label: "Skill / academic update" },
  { value: "positive", label: "Something they did really well" },
  { value: "other", label: "Other" },
];
const METHOD_OPTIONS = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
];
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASON_OPTIONS.map((r) => [r.value, r.label]));
const METHOD_LABEL: Record<string, string> = Object.fromEntries(METHOD_OPTIONS.map((m) => [m.value, m.label]));

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BehaviorLogPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<BehaviorNote[]>([]);
  const [contactLogs, setContactLogs] = useState<FullContactLog[]>([]);
  const [classroomId, setClassroomId] = useState("");

  const [showSubjectEditor, setShowSubjectEditor] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // Quick-add behavior note
  const [noteStudentId, setNoteStudentId] = useState("");
  const [noteDate, setNoteDate] = useState(todayStr);
  const [noteType, setNoteType] = useState<"good" | "bad">("good");
  const [noteTag, setNoteTag] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSubjectId, setNoteSubjectId] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Notes list filters
  const [notesFilterStudentId, setNotesFilterStudentId] = useState("");
  const [needsCallOnly, setNeedsCallOnly] = useState(false);

  // Inline "log call" mini-form, keyed by note id
  const [callingNoteId, setCallingNoteId] = useState<string | null>(null);
  const [callMethod, setCallMethod] = useState("phone");
  const [callComment, setCallComment] = useState("");
  const [callFollowUp, setCallFollowUp] = useState(false);
  const [callDate, setCallDate] = useState(todayStr);
  const [savingCall, setSavingCall] = useState(false);

  // General contact log (not tied to a behavior note)
  const [gcStudentId, setGcStudentId] = useState("");
  const [gcDate, setGcDate] = useState(todayStr);
  const [gcReason, setGcReason] = useState("behavior");
  const [gcMethod, setGcMethod] = useState("phone");
  const [gcComment, setGcComment] = useState("");
  const [gcFollowUp, setGcFollowUp] = useState(false);
  const [savingGc, setSavingGc] = useState(false);

  // Contact history filters
  const [historyFilterStudentId, setHistoryFilterStudentId] = useState("");
  const [historyFollowUpOnly, setHistoryFollowUpOnly] = useState(false);

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? ""));
    loadSubjects();
    loadNotes();
    loadContactLogs();
  }, []);

  function loadSubjects() {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }
  function loadNotes() {
    fetch("/api/behavior-notes").then((r) => r.json()).then(setNotes);
  }
  function loadContactLogs(studentId?: string) {
    const url = studentId
      ? `/api/parent-contact-log?studentId=${studentId}`
      : "/api/parent-contact-log";
    fetch(url).then((r) => r.json()).then(setContactLogs);
  }

  useEffect(() => {
    loadContactLogs(historyFilterStudentId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilterStudentId]);

  async function addSubject() {
    if (!newSubjectName.trim() || !classroomId) return;
    await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId, name: newSubjectName.trim(), order: subjects.length }),
    });
    setNewSubjectName("");
    loadSubjects();
  }

  async function addNote() {
    if (!noteStudentId || !noteTag.trim()) return;
    setSavingNote(true);
    await fetch("/api/behavior-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: noteStudentId,
        date: noteDate,
        type: noteType,
        tag: noteTag.trim(),
        note: noteText || null,
        subjectId: noteSubjectId || null,
      }),
    });
    setNoteTag("");
    setNoteText("");
    setSavingNote(false);
    loadNotes();
  }

  function openCallForm(note: BehaviorNote) {
    setCallingNoteId(note.id);
    setCallMethod("phone");
    setCallComment("");
    setCallFollowUp(false);
    setCallDate(todayStr());
    // Good behavior notes count toward the positive-call rotation goal by
    // default; bad ones default to a plain "behavior concern" call.
    setGcReason(note.type === "good" ? "positive" : "behavior");
  }

  async function saveCall(note: BehaviorNote) {
    setSavingCall(true);
    await fetch("/api/parent-contact-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: note.student.id,
        date: callDate,
        reason: note.type === "good" ? "positive" : "behavior",
        method: callMethod,
        comment: callComment || null,
        followUp: callFollowUp,
        linkBehaviorNoteId: note.id,
      }),
    });
    setSavingCall(false);
    setCallingNoteId(null);
    loadNotes();
    loadContactLogs();
  }

  async function removeNote(id: string) {
    if (!confirm("Delete this behavior note? This won't delete a linked call log entry.")) return;
    await fetch(`/api/behavior-notes/${id}`, { method: "DELETE" });
    loadNotes();
  }

  async function addGeneralContact() {
    if (!gcStudentId) return;
    setSavingGc(true);
    await fetch("/api/parent-contact-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: gcStudentId,
        date: gcDate,
        reason: gcReason,
        method: gcMethod,
        comment: gcComment,
        followUp: gcFollowUp,
      }),
    });
    setSavingGc(false);
    setGcStudentId("");
    setGcComment("");
    setGcFollowUp(false);
    loadContactLogs();
  }

  async function toggleFollowUp(log: FullContactLog) {
    setContactLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, followUp: !l.followUp } : l)));
    await fetch("/api/parent-contact-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: log.id, followUp: !log.followUp }),
    });
  }

  const filteredNotes = notes.filter(
    (n) =>
      (!notesFilterStudentId || n.student.id === notesFilterStudentId) &&
      (!needsCallOnly || !n.contactLog)
  );
  const filteredHistory = contactLogs.filter((l) => !historyFollowUpOnly || l.followUp);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Behavior & Parent Contact Log</h1>
      <p className="text-sm text-slate-500 mb-4">
        Log a quick good or bad behavior note as it happens, then circle back and log the call
        whenever you actually make it - that's what marks it "called." You can also log parent
        contacts for other reasons any time, whether or not they're tied to a behavior note.
      </p>

      <div className="mb-6">
        <ParentContactRotationWidget />
      </div>

      <button
        onClick={() => setShowSubjectEditor((s) => !s)}
        className="text-sm text-sky-600 hover:underline mb-3"
      >
        {showSubjectEditor ? "Hide" : "Edit"} Periods/Subjects (optional tags for notes)
      </button>
      {showSubjectEditor && (
        <div className="border rounded p-3 mb-4 flex gap-2 items-center">
          <input
            placeholder="New period/subject name (e.g. Science, Recess)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <button onClick={addSubject} className="btn-primary">
            Add
          </button>
        </div>
      )}

      {/* Quick-add behavior note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: behavior notes */}
        <div>
          <div className="panel mb-6 space-y-2">
            <h2 className="font-semibold text-sm">Log a Behavior</h2>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500">Student</label>
            <select
              value={noteStudentId}
              onChange={(e) => setNoteStudentId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">Select...</option>
              {visibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Type</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setNoteType("good")}
                className={`px-3 py-1 rounded text-sm border ${
                  noteType === "good" ? "bg-emerald-200 border-emerald-400" : "bg-white"
                }`}
              >
                🙂 Good
              </button>
              <button
                type="button"
                onClick={() => setNoteType("bad")}
                className={`px-3 py-1 rounded text-sm border ${
                  noteType === "bad" ? "bg-rose-200 border-rose-400" : "bg-white"
                }`}
              >
                🙁 Bad
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Period/subject (optional)</label>
            <select
              value={noteSubjectId}
              onChange={(e) => setNoteSubjectId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500">Tag</label>
          <input
            list={noteType === "good" ? "good-tags" : "bad-tags"}
            value={noteTag}
            onChange={(e) => setNoteTag(e.target.value)}
            placeholder="e.g. Kind to a classmate"
            className="border rounded px-2 py-1 w-full"
          />
          <datalist id="good-tags">
            {GOOD_TAGS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <datalist id="bad-tags">
            {BAD_TAGS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <textarea
          placeholder="Optional note with more detail..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="border rounded px-2 py-1 w-full text-sm"
          rows={2}
        />
        <button
          onClick={addNote}
          disabled={savingNote || !noteStudentId || !noteTag.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {savingNote ? "Saving..." : "Add Behavior Note"}
        </button>
      </div>

      {/* Behavior notes list */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="font-semibold">Behavior Notes</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={needsCallOnly}
              onChange={(e) => setNeedsCallOnly(e.target.checked)}
            />
            Needs a call only
          </label>
          <select
            value={notesFilterStudentId}
            onChange={(e) => setNotesFilterStudentId(e.target.value)}
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

      <div className="space-y-2 mb-8">
        {filteredNotes.map((n) => (
          <div key={n.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p>
                  <span
                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                    style={{ backgroundColor: n.type === "good" ? "#bbf7d0" : "#fecaca" }}
                  >
                    {n.type === "good" ? "Good" : "Bad"}
                  </span>
                  <span className="font-medium">
                    {n.student.lastName}, {n.student.firstName}
                  </span>{" "}
                  — {new Date(n.date).toLocaleDateString()}
                  {n.subject && <span className="text-slate-500"> · {n.subject.name}</span>}
                </p>
                <p className="mt-1">{n.tag}</p>
                {n.note && <p className="text-slate-500 text-xs mt-0.5">{n.note}</p>}
              </div>
              <div className="text-right shrink-0">
                {n.contactLog ? (
                  <p className="text-xs text-emerald-700">
                    ✅ Called {new Date(n.contactLog.date).toLocaleDateString()} via{" "}
                    {METHOD_LABEL[n.contactLog.method] ?? n.contactLog.method}
                    {n.contactLog.followUp && <span className="block text-amber-600">Needs follow up</span>}
                  </p>
                ) : callingNoteId === n.id ? null : (
                  <button onClick={() => openCallForm(n)} className="btn-outline text-xs">
                    Log Call
                  </button>
                )}
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-rose-600 text-xs hover:underline block mt-1"
                >
                  Remove
                </button>
              </div>
            </div>

            {callingNoteId === n.id && (
              <div className="mt-3 border-t pt-3 flex gap-2 flex-wrap items-end">
                <div>
                  <label className="block text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Method</label>
                  <select
                    value={callMethod}
                    onChange={(e) => setCallMethod(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {METHOD_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs text-slate-500">What was discussed</label>
                  <input
                    value={callComment}
                    onChange={(e) => setCallComment(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                  />
                </div>
                <label className="flex items-center gap-1 text-sm mb-1">
                  <input
                    type="checkbox"
                    checked={callFollowUp}
                    onChange={(e) => setCallFollowUp(e.target.checked)}
                  />
                  Follow up
                </label>
                <button
                  onClick={() => saveCall(n)}
                  disabled={savingCall}
                  className="btn-primary text-sm"
                >
                  {savingCall ? "Saving..." : "Save Call"}
                </button>
                <button onClick={() => setCallingNoteId(null)} className="btn-outline text-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredNotes.length === 0 && <p className="text-slate-500 text-sm">No behavior notes yet.</p>}
      </div>
        </div>

        {/* Right column: general contact log */}
        <div>
      {/* General (non-behavior) contact log */}
      <h2 className="font-semibold mb-2">Log a Contact for Another Reason</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left bg-violet-50/60">
              <th className="border p-2">Student</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Reason</th>
              <th className="border p-2">Contacted via</th>
              <th className="border p-2">Comments</th>
              <th className="border p-2">Follow up?</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1">
                <select
                  value={gcStudentId}
                  onChange={(e) => setGcStudentId(e.target.value)}
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
                  value={gcDate}
                  onChange={(e) => setGcDate(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td className="border p-1">
                <select
                  value={gcReason}
                  onChange={(e) => setGcReason(e.target.value)}
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
                  value={gcMethod}
                  onChange={(e) => setGcMethod(e.target.value)}
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
                  value={gcComment}
                  onChange={(e) => setGcComment(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td className="border p-1 text-center">
                <input
                  type="checkbox"
                  checked={gcFollowUp}
                  onChange={(e) => setGcFollowUp(e.target.checked)}
                />
              </td>
              <td className="border p-1 text-center">
                <button
                  onClick={addGeneralContact}
                  disabled={savingGc || !gcStudentId}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {savingGc ? "..." : "Add"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Full contact history */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Contact History</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={historyFollowUpOnly}
              onChange={(e) => setHistoryFollowUpOnly(e.target.checked)}
            />
            Needs follow up only
          </label>
          <select
            value={historyFilterStudentId}
            onChange={(e) => setHistoryFilterStudentId(e.target.value)}
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
            {filteredHistory.map((log) => (
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
        {contactLogs.length === 0 && <p className="text-slate-500 mt-2">No contacts logged yet.</p>}
      </div>
        </div>
      </div>
    </div>
  );
}
