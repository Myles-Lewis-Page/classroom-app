"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatShortDate } from "@/lib/dateOnly";

type Student = { id: string; firstName: string; lastName: string };
type EventStatus = {
  id: string;
  slipStatus: string;
  paymentStatus: string | null;
  confirmed: boolean;
  student: Student;
};
type Chaperone = {
  id: string;
  parentName: string;
  relationship: string;
  confirmed: boolean;
  student: Student;
};
type ChaperoneInterest = {
  id: string;
  parentName: string;
  contactInfo: string;
  note: string | null;
  createdAt: string;
  // The parent types this in on the public form - it's never validated
  // against the roster (privacy fix: the public page never sees the
  // roster). student is only ever set later, manually, by the teacher.
  studentName: string;
  student: Student | null;
};
type EventDetail = {
  id: string;
  name: string;
  date: string;
  dueDate: string | null;
  requiresPayment: boolean;
  paymentAmount: number | null;
  description: string | null;
  notes: string | null;
  chaperonesNeeded: number | null;
  statuses: EventStatus[];
  chaperones: Chaperone[];
  chaperoneInterests: ChaperoneInterest[];
  sections: { id: string; name: string }[];
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventDetail | null>(null);

  // Editable header fields
  const [editingHeader, setEditingHeader] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [chaperonesNeeded, setChaperonesNeeded] = useState("");
  const [description, setDescription] = useState("");

  // Teacher notes (autosave on blur)
  const [notes, setNotes] = useState("");

  // New chaperone form
  const [chapStudentId, setChapStudentId] = useState("");
  const [chapParentName, setChapParentName] = useState("");
  // The public interest form never touches the roster (privacy fix), so it
  // can't reliably prefill chapStudentId - this just surfaces what the
  // parent typed so the teacher can pick the matching student herself.
  const [chapNameHint, setChapNameHint] = useState("");
  const [chapRelationship, setChapRelationship] = useState("Mom");
  const [chapError, setChapError] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((e: EventDetail) => {
        setEvent(e);
        setName(e.name);
        setDate(e.date.slice(0, 10));
        setDueDate(e.dueDate ? e.dueDate.slice(0, 10) : "");
        setRequiresPayment(e.requiresPayment);
        setPaymentAmount(e.paymentAmount != null ? String(e.paymentAmount) : "");
        setChaperonesNeeded(e.chaperonesNeeded != null ? String(e.chaperonesNeeded) : "");
        setDescription(e.description ?? "");
        setNotes(e.notes ?? "");
      });
  }

  async function saveHeader() {
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        date,
        dueDate: dueDate || null,
        requiresPayment,
        paymentAmount: requiresPayment ? paymentAmount || null : null,
        chaperonesNeeded: chaperonesNeeded || null,
        description: description || null,
      }),
    });
    setEditingHeader(false);
    load();
  }

  async function saveNotes() {
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function setStatus(studentId: string, field: "slipStatus" | "paymentStatus" | "confirmed", value: string | boolean) {
    await fetch(`/api/events/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, [field]: value }),
    });
    load();
  }

  async function addChaperone() {
    setChapError("");
    if (!chapStudentId || !chapParentName.trim() || !chapRelationship.trim()) {
      setChapError("Pick a student and fill in the parent's name.");
      return;
    }
    const res = await fetch(`/api/events/${id}/chaperones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: chapStudentId,
        parentName: chapParentName.trim(),
        relationship: chapRelationship.trim(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setChapError(data.error || "Couldn't add that chaperone.");
      return;
    }
    setChapStudentId("");
    setChapParentName("");
    setChapRelationship("Mom");
    load();
  }

  async function toggleChaperoneConfirmed(chaperoneId: string, confirmed: boolean) {
    await fetch(`/api/events/${id}/chaperones/${chaperoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: !confirmed }),
    });
    load();
  }

  async function removeChaperone(chaperoneId: string) {
    if (!confirm("Remove this chaperone signup?")) return;
    await fetch(`/api/events/${id}/chaperones/${chaperoneId}`, { method: "DELETE" });
    load();
  }

  const [linkCopied, setLinkCopied] = useState(false);
  function copyInterestLink() {
    const url = `${window.location.origin}/chaperone-interest/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function useInterestForChaperone(interest: ChaperoneInterest) {
    // Prefer an already-linked student (teacher manually linked this
    // interest to a roster record at some point); otherwise leave the
    // student picker for the teacher to fill in themselves, since a
    // parent-typed name on the public form is never validated against the
    // roster.
    setChapStudentId(interest.student?.id ?? "");
    setChapParentName(interest.parentName);
    setChapNameHint(interest.student ? "" : interest.studentName);
  }

  async function dismissInterest(interestId: string) {
    await fetch(`/api/events/${id}/interest/${interestId}`, { method: "DELETE" });
    load();
  }

  if (!event) return <div className="p-6">Loading...</div>;

  const missingSlips = event.statuses.filter((s) => s.slipStatus === "missing").length;
  const confirmedChaperones = event.chaperones.filter((c) => c.confirmed).length;
  const shortOnChaperones =
    event.chaperonesNeeded != null && confirmedChaperones < event.chaperonesNeeded;
  // Only offer students who don't already have a chaperone signup - the
  // server also enforces this, but hiding them here keeps the picker clean.
  const chaperonedStudentIds = new Set(event.chaperones.map((c) => c.student.id));
  const availableStudents = event.statuses
    .map((s) => s.student)
    .filter((s) => !chaperonedStudentIds.has(s.id));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/events" className="text-sky-600 text-sm hover:underline">
        ← Back to Events
      </Link>

      <div className="border rounded p-4 my-4">
        {!editingHeader ? (
          <>
            <div className="flex justify-between items-start gap-2">
              <div>
                <h1 className="text-2xl font-bold">{event.name}</h1>
                <p className="text-sm text-slate-600">
                  {formatShortDate(event.date)}
                  {event.dueDate && ` · Slip/payment due ${formatShortDate(event.dueDate)}`}
                  {event.requiresPayment && event.paymentAmount != null && ` · $${event.paymentAmount} each`}
                </p>
                {event.description && <p className="text-sm text-slate-600 mt-1">{event.description}</p>}
                {event.sections.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Periods: {event.sections.map((s) => s.name).join(", ")}
                  </p>
                )}
              </div>
              <button onClick={() => setEditingHeader(true)} className="btn-outline text-sm shrink-0">
                Edit
              </button>
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <span>{missingSlips} of {event.statuses.length} slips missing</span>
              {event.chaperonesNeeded != null && (
                <span className={shortOnChaperones ? "text-amber-600 font-medium" : ""}>
                  {confirmedChaperones} of {event.chaperonesNeeded} chaperones confirmed
                  {shortOnChaperones && " — still need more"}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded px-2 py-1 w-full font-bold"
            />
            <textarea
              placeholder="Description (optional, visible on the calendar/reminders)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm"
            />
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-500">Event date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Slip/payment due</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border rounded px-2 py-1" />
              </div>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={requiresPayment} onChange={(e) => setRequiresPayment(e.target.checked)} />
                Requires payment
              </label>
              {requiresPayment && (
                <div>
                  <label className="block text-xs text-slate-500">Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="border rounded px-2 py-1 w-24"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500">Chaperones needed</label>
                <input
                  type="number"
                  min={0}
                  value={chaperonesNeeded}
                  onChange={(e) => setChaperonesNeeded(e.target.value)}
                  className="border rounded px-2 py-1 w-24"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveHeader} className="btn-primary text-sm">Save</button>
              <button onClick={() => setEditingHeader(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded p-4 mb-4">
        <h2 className="font-semibold mb-2">Teacher Notes</h2>
        <p className="text-xs text-slate-400 mb-2">Private - never shown to parents or on the weekly email.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Anything you want to remember about this event..."
          className="border rounded px-2 py-1 w-full text-sm"
          rows={3}
        />
      </div>

      <div className="border rounded p-4 mb-4">
        <h2 className="font-semibold mb-2">Students</h2>
        <ul className="space-y-1">
          {event.statuses.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b py-2">
              <span>
                {s.student.lastName}, {s.student.firstName}
              </span>
              <span className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStatus(s.student.id, "slipStatus", s.slipStatus === "in" ? "missing" : "in")}
                  className={`px-2 py-1 rounded text-xs ${s.slipStatus === "in" ? "bg-emerald-200 text-slate-800" : "bg-rose-100 text-rose-700"}`}
                >
                  {s.slipStatus === "in" ? "Slip In" : "Slip Missing"}
                </button>
                {event.requiresPayment && (
                  <button
                    onClick={() =>
                      setStatus(s.student.id, "paymentStatus", s.paymentStatus === "paid" ? "unpaid" : "paid")
                    }
                    className={`px-2 py-1 rounded text-xs ${s.paymentStatus === "paid" ? "bg-emerald-200 text-slate-800" : "bg-amber-100 text-amber-700"}`}
                  >
                    {s.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </button>
                )}
                <button
                  onClick={() => setStatus(s.student.id, "confirmed", !s.confirmed)}
                  className={`px-2 py-1 rounded text-xs ${s.confirmed ? "bg-sky-200 text-slate-800" : "bg-slate-100 text-slate-500"}`}
                >
                  {s.confirmed ? "Confirmed Coming" : "Not Confirmed"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border rounded p-4 mb-4 bg-sky-50">
        <h2 className="font-semibold mb-1">Chaperone Interest Link</h2>
        <p className="text-sm text-slate-600 mb-2">
          Share this with parents (email, class app, printed flyer/QR code). It doesn&apos;t sign
          anyone up directly - it just lets you know who&apos;s interested, so you can follow up
          with the details yourself before confirming anyone.
        </p>
        <div className="flex gap-2 items-center">
          <code className="text-xs bg-white border rounded px-2 py-1 flex-1 overflow-x-auto whitespace-nowrap">
            {typeof window !== "undefined" ? `${window.location.origin}/chaperone-interest/${id}` : ""}
          </code>
          <button onClick={copyInterestLink} className="btn-outline text-sm shrink-0">
            {linkCopied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {event.chaperoneInterests.length > 0 && (
        <div className="border rounded p-4 mb-4">
          <h2 className="font-semibold mb-2">
            Interested Parents ({event.chaperoneInterests.length})
          </h2>
          <ul className="space-y-2">
            {event.chaperoneInterests.map((interest) => (
              <li key={interest.id} className="text-sm border-b py-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium">{interest.parentName}</span> — parent of{" "}
                    {interest.studentName}
                    <br />
                    <span className="text-slate-500">{interest.contactInfo}</span>
                    {interest.note && <p className="text-slate-500 italic mt-0.5">&quot;{interest.note}&quot;</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => useInterestForChaperone(interest)}
                      className="text-sky-600 text-xs hover:underline"
                      title="Fill in the chaperone form below with this parent's info"
                    >
                      Use for Chaperone
                    </button>
                    <button
                      onClick={() => dismissInterest(interest.id)}
                      className="text-rose-600 text-xs hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border rounded p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Chaperones</h2>
          {event.chaperonesNeeded != null && (
            <span className={`text-sm ${shortOnChaperones ? "text-amber-600 font-medium" : "text-slate-500"}`}>
              {confirmedChaperones} of {event.chaperonesNeeded} confirmed
            </span>
          )}
        </div>
        <ul className="space-y-1 mb-3">
          {event.chaperones.map((c) => (
            <li key={c.id} className="flex justify-between items-center text-sm border-b py-2">
              <span>
                {c.student.lastName}, {c.student.firstName} — {c.parentName} ({c.relationship})
              </span>
              <span className="flex gap-2 items-center">
                <button
                  onClick={() => toggleChaperoneConfirmed(c.id, c.confirmed)}
                  className={`px-2 py-1 rounded text-xs ${c.confirmed ? "bg-emerald-200 text-slate-800" : "bg-slate-100 text-slate-500"}`}
                >
                  {c.confirmed ? "Confirmed" : "Not Confirmed"}
                </button>
                <button onClick={() => removeChaperone(c.id)} className="text-rose-600 text-xs hover:underline">
                  Remove
                </button>
              </span>
            </li>
          ))}
          {event.chaperones.length === 0 && <p className="text-slate-400 text-sm">No chaperone signups yet.</p>}
        </ul>

        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500">
              Student
              {chapNameHint && (
                <span className="text-sky-600 font-normal"> (parent typed: &quot;{chapNameHint}&quot;)</span>
              )}
            </label>
            <select
              value={chapStudentId}
              onChange={(e) => {
                setChapStudentId(e.target.value);
                setChapNameHint("");
              }}
              className="border rounded px-2 py-1"
            >
              <option value="">Select student</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Parent's name</label>
            <input
              value={chapParentName}
              onChange={(e) => setChapParentName(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Relationship</label>
            <select
              value={chapRelationship}
              onChange={(e) => setChapRelationship(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="Mom">Mom</option>
              <option value="Dad">Dad</option>
              <option value="Guardian">Guardian</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button onClick={addChaperone} className="btn-primary text-sm">
            Add
          </button>
        </div>
        {chapError && <p className="text-rose-600 text-sm mt-1">{chapError}</p>}
      </div>
    </div>
  );
}
