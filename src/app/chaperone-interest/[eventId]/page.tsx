"use client";

import { useEffect, useState, use } from "react";

type Student = { id: string; firstName: string; lastName: string };
type EventInfo = { id: string; name: string; date: string };

export default function ChaperoneInterestPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/chaperone-interest?eventId=${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setEvent(data.event);
        setStudents(data.students);
      })
      .catch(() => setLoadError(true));
  }, [eventId]);

  async function submit() {
    setError("");
    if (!studentId || !parentName.trim() || !contactInfo.trim()) {
      setError("Please pick your child and fill in your name and a way to reach you.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/chaperone-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        studentId,
        parentName: parentName.trim(),
        contactInfo: contactInfo.trim(),
        note: note.trim(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong - please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-6 bg-slate-50">
        <p className="text-slate-500">
          This link doesn't seem to work anymore - please check with your child's teacher for a
          current one.
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-6 bg-slate-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white border rounded-lg p-6 text-center">
          <h1 className="text-xl font-bold mb-2">Thanks for your interest!</h1>
          <p className="text-slate-600">
            The teacher will follow up with you directly by email or phone with the details.
            This isn&apos;t a final confirmation yet - just letting her know you&apos;d like to help.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white border rounded-lg p-6">
        <h1 className="text-xl font-bold mb-1">Chaperone Interest</h1>
        <p className="text-slate-600 mb-4">
          {event.name} — {new Date(event.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
        </p>
        <p className="text-sm text-slate-500 mb-4">
          This just lets the teacher know you&apos;re interested - she&apos;ll reach out to you directly
          with everything you need before it&apos;s confirmed.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Your child</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="border rounded px-2 py-2 w-full"
            >
              <option value="">Select your child</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Your name</label>
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="border rounded px-2 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email or phone</label>
            <input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="border rounded px-2 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Anything else? (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="border rounded px-2 py-2 w-full text-sm"
            />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full py-2 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "I'm Interested"}
          </button>
        </div>
      </div>
    </div>
  );
}
