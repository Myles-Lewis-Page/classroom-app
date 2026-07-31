"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSectionContext } from "@/components/SectionContext";
import { formatShortDate } from "@/lib/dateOnly";

type EventItem = {
  id: string;
  name: string;
  date: string;
  dueDate: string | null;
  requiresPayment: boolean;
  paymentAmount: number | null;
  chaperonesNeeded: number | null;
  statuses: { slipStatus: string }[];
  chaperones: { confirmed: boolean }[];
  sections: { id: string; name: string }[];
};

export default function EventsPage() {
  const { sections } = useSectionContext();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newChaperonesNeeded, setNewChaperonesNeeded] = useState("");
  const [newSectionIds, setNewSectionIds] = useState<string[]>([]);
  const [classroomId, setClassroomId] = useState<string>("");
  const [classroomError, setClassroomError] = useState(false);
  const [classroomLoading, setClassroomLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState(false);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    loadClassroom();
  }, []);

  function loadClassroom() {
    setClassroomLoading(true);
    setClassroomError(false);
    setAuthIssue(false);
    fetch("/api/classroom")
      .then((r) => {
        if (r.status === 401) {
          setAuthIssue(true);
          throw new Error("unauthorized");
        }
        if (!r.ok) throw new Error("Failed to load classroom");
        return r.json();
      })
      .then((c) => {
        if (!c?.id) {
          setClassroomError(true);
          return;
        }
        setClassroomId(c.id);
      })
      .catch(() => setClassroomError(true))
      .finally(() => setClassroomLoading(false));
  }

  function load() {
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }

  async function removeEvent(eventId: string, name: string) {
    if (!confirm(`Remove "${name}"? This also removes its reminder on the School Calendar.`)) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    load();
  }

  async function createEvent() {
    setFormError("");
    if (!newName || !newDate) {
      setFormError("Enter a name and date.");
      return;
    }
    if (!classroomId) {
      setFormError("No classroom found for your account yet.");
      return;
    }
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        name: newName,
        date: newDate,
        dueDate: newDueDate || null,
        requiresPayment,
        paymentAmount: requiresPayment && newPaymentAmount ? Number(newPaymentAmount) : null,
        chaperonesNeeded: newChaperonesNeeded ? Number(newChaperonesNeeded) : null,
        sectionIds: newSectionIds,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "Couldn't create the event.");
      return;
    }
    setNewName("");
    setNewDate("");
    setNewDueDate("");
    setRequiresPayment(false);
    setNewPaymentAmount("");
    setNewChaperonesNeeded("");
    setNewSectionIds([]);
    setShowForm(false);
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Event Tracker</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + New Event
          </button>
        )}
      </div>

      {showForm && (
        <div className="border rounded p-4 mb-6">
          <h2 className="font-semibold mb-2">New Event</h2>
          {classroomError && !classroomLoading && authIssue && (
            <p className="text-rose-600 text-sm mb-2">
              ⚠️ Your session may have expired.{" "}
              <a href="/login" className="underline font-medium">
                Log in again
              </a>
              , or{" "}
              <button onClick={loadClassroom} className="underline font-medium">
                try reloading
              </button>
              .
            </p>
          )}
          {classroomError && !classroomLoading && !authIssue && (
            <p className="text-rose-600 text-sm mb-2">
              ⚠️ You don't have a classroom set up yet.{" "}
              <Link href="/profile" className="underline font-medium">
                Set up your profile
              </Link>{" "}
              to create one, or{" "}
              <button onClick={loadClassroom} className="underline font-medium">
                try reloading
              </button>{" "}
              if you know one already exists.
            </p>
          )}
          <div className="flex gap-2 flex-wrap items-end">
            <input
              placeholder="Event name (e.g. Zoo Field Trip)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
            />
            <div>
              <label className="block text-xs text-slate-500">Event date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Slip/payment due (optional)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-end mt-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={requiresPayment}
                onChange={(e) => setRequiresPayment(e.target.checked)}
              />
              Requires payment
            </label>
            {requiresPayment && (
              <div>
                <label className="block text-xs text-slate-500">Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  className="border rounded px-2 py-1 w-24"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500">Chaperones needed (optional)</label>
              <input
                type="number"
                min={0}
                value={newChaperonesNeeded}
                onChange={(e) => setNewChaperonesNeeded(e.target.value)}
                className="border rounded px-2 py-1 w-24"
              />
            </div>
          </div>
          {sections.length > 0 && (
            <div className="mt-2">
              <label className="block text-xs text-slate-500">Periods (blank = whole class)</label>
              <div className="flex flex-wrap gap-2 border rounded px-2 py-1">
                {sections.map((s) => (
                  <label key={s.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={newSectionIds.includes(s.id)}
                      onChange={(e) =>
                        setNewSectionIds((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                        )
                      }
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {formError && <p className="text-rose-600 text-sm mt-2">{formError}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={createEvent}
              disabled={!classroomId}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline">
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Every event also shows up on the{" "}
            <Link href="/school-calendar" className="underline">
              School Calendar
            </Link>{" "}
            as a reminder, and in the Pacing Guide's "Dates to Remember" for any unit it falls
            within. More details (notes, chaperone signups, per-student status) live on the
            event's own page after you create it.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event) => {
          const missingSlips = event.statuses.filter((s) => s.slipStatus === "missing").length;
          const confirmedChaperones = event.chaperones.filter((c) => c.confirmed).length;
          const shortOnChaperones =
            event.chaperonesNeeded != null && confirmedChaperones < event.chaperonesNeeded;
          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block border rounded p-4 hover:bg-slate-50"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold">
                    {event.name} — {formatShortDate(event.date)}
                    {event.sections.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        ({event.sections.map((s) => s.name).join(", ")})
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {missingSlips} of {event.statuses.length} slips missing
                    {event.requiresPayment && event.paymentAmount != null && ` · $${event.paymentAmount} each`}
                    {event.dueDate && ` · Due ${formatShortDate(event.dueDate)}`}
                  </p>
                  {event.chaperonesNeeded != null && (
                    <p className={`text-sm ${shortOnChaperones ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                      {confirmedChaperones} of {event.chaperonesNeeded} chaperones confirmed
                      {shortOnChaperones && " — still need more"}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeEvent(event.id, event.name);
                  }}
                  className="text-rose-600 text-xs hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            </Link>
          );
        })}
        {events.length === 0 && <p className="text-slate-500">No events yet — add your first one above.</p>}
      </div>
    </div>
  );
}
