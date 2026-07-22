"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EventStatus = {
  id: string;
  slipStatus: string;
  paymentStatus: string | null;
  student: { id: string; firstName: string; lastName: string };
};
type EventItem = {
  id: string;
  name: string;
  date: string;
  requiresPayment: boolean;
  statuses: EventStatus[];
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [classroomId, setClassroomId] = useState<string>("");
  const [classroomError, setClassroomError] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/classroom")
      .then((r) => {
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
      .catch(() => setClassroomError(true));
  }, []);

  function load() {
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }

  async function createEvent() {
    if (!newName || !newDate) return;
    if (!classroomId) {
      alert("No classroom found for your account yet. Please contact support or re-run setup/seed.");
      return;
    }
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        name: newName,
        date: newDate,
        requiresPayment,
      }),
    });
    setNewName("");
    setNewDate("");
    setRequiresPayment(false);
    load();
  }

  async function toggleSlip(eventId: string, studentId: string, current: string) {
    const next = current === "in" ? "missing" : "in";
    await fetch(`/api/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, slipStatus: next }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Event Tracker</h1>

      <div className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">New Event</h2>
        {classroomError && (
          <p className="text-rose-600 text-sm mb-2">
            ⚠️ You don't have a classroom set up yet.{" "}
            <Link href="/profile" className="underline font-medium">
              Set up your profile
            </Link>{" "}
            to create one before adding events.
          </p>
        )}
        <div className="flex gap-2 flex-wrap items-end">
          <input
            placeholder="Event name (e.g. Zoo Field Trip)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={requiresPayment}
              onChange={(e) => setRequiresPayment(e.target.checked)}
            />
            Requires payment
          </label>
          <button
            onClick={createEvent}
            disabled={!classroomId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm mb-4">
        <input
          type="checkbox"
          checked={showMissingOnly}
          onChange={(e) => setShowMissingOnly(e.target.checked)}
        />
        Show only missing slips
      </label>

      {events.map((event) => {
        const statuses = showMissingOnly
          ? event.statuses.filter((s) => s.slipStatus === "missing")
          : event.statuses;
        return (
          <div key={event.id} className="border rounded p-4 mb-4">
            <h3 className="font-bold mb-1">
              {event.name} — {new Date(event.date).toLocaleDateString()}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              {event.statuses.filter((s) => s.slipStatus === "missing").length} missing of{" "}
              {event.statuses.length}
            </p>
            <ul className="space-y-1">
              {statuses.map((s) => (
                <li key={s.id} className="flex justify-between items-center text-sm border-b py-1">
                  <span>
                    {s.student.lastName}, {s.student.firstName}
                    {event.requiresPayment && s.paymentStatus === "unpaid" && (
                      <span className="text-amber-600 ml-2">$ unpaid</span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleSlip(event.id, s.student.id, s.slipStatus)}
                    className={`px-2 py-1 rounded text-xs ${
                      s.slipStatus === "in" ? "bg-emerald-200 text-slate-800" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {s.slipStatus === "in" ? "Slip In" : "Slip Missing"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
