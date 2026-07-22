"use client";

import { useEffect, useState } from "react";

type SubStudent = {
  id: string;
  firstName: string;
  lastName: string;
  allergies: { allergen: string; severity: string; reaction: string | null }[];
  dietaryRestrictions: { restriction: string }[];
  ieps: { subSafeSummary: string | null; accommodations: string }[];
  seatingAssignment: { posX: number; posY: number } | null;
  observations: { note: string }[];
};
type Subject = { id: string; name: string };

export default function SubModePage() {
  const [students, setStudents] = useState<SubStudent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetch("/api/sub-mode")
      .then((r) => r.json())
      .then(({ students, subjects }) => {
        setStudents(students);
        setSubjects(subjects);
      });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto print:p-0">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Sub Day Packet</h1>
        <button onClick={() => window.print()} className="btn-primary px-4 py-2">
          Print Packet
        </button>
      </div>

      <section className="mb-6">
        <h2 className="font-bold text-lg mb-2">Daily Schedule</h2>
        <ol className="list-decimal list-inside text-sm">
          {subjects.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-lg mb-2">Behavior Expectations</h2>
        <p className="text-sm">
          Calm Body · Listening Ears · Kind Words · Stay in Area · Finished Work
        </p>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Student Notes</h2>
        <div className="space-y-3">
          {students.map((s) => {
            const hasSafetyInfo = s.allergies.length > 0 || s.dietaryRestrictions.length > 0;
            const hasIep = s.ieps.length > 0;
            const hasNotes = s.observations.length > 0;
            return (
              <div key={s.id} className="border rounded p-3 break-inside-avoid">
                <p className="font-semibold">
                  {s.firstName} {s.lastName}
                  {s.seatingAssignment && (
                    <span className="text-gray-500 font-normal">
                      {" "}
                      (seat: row {s.seatingAssignment.posY + 1}, col {s.seatingAssignment.posX + 1})
                    </span>
                  )}
                </p>
                {hasSafetyInfo && (
                  <p className="text-rose-700 text-sm">
                    ⚠️{" "}
                    {s.allergies
                      .map((a) => `${a.allergen} allergy (${a.severity})`)
                      .concat(s.dietaryRestrictions.map((d) => d.restriction))
                      .join(", ")}
                  </p>
                )}
                {hasIep && (
                  <p className="text-sm text-sky-700">
                    IEP/504:{" "}
                    {s.ieps.map((i) => i.subSafeSummary || i.accommodations).join("; ")}
                  </p>
                )}
                {hasNotes && (
                  <p className="text-sm text-gray-600">
                    Notes: {s.observations.map((o) => o.note).join("; ")}
                  </p>
                )}
                {!hasSafetyInfo && !hasIep && !hasNotes && (
                  <p className="text-sm text-gray-400">No special notes</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
