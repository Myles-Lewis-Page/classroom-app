"use client";

import { useEffect, useState, useMemo } from "react";
import { useSectionContext, filterBySection } from "@/components/SectionContext";
import PeriodPicker from "@/components/PeriodPicker";

type SubStudent = {
  id: string;
  firstName: string;
  lastName: string;
  sectionId: string | null;
  allergies: { allergen: string; severity: string }[];
  dietaryRestrictions: { restriction: string }[];
  hasIep: boolean;
  seatingAssignment: { posX: number; posY: number } | null;
  observations: { note: string }[];
};
type Subject = { id: string; name: string };

export default function SubModePage() {
  const { sections } = useSectionContext();
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [students, setStudents] = useState<SubStudent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const visibleStudents = useMemo(
    () => filterBySection(students, periodId),
    [students, periodId]
  );

  useEffect(() => {
    fetch("/api/sub-mode")
      .then((r) => r.json())
      .then(({ students, subjects }) => {
        setStudents(students);
        setSubjects(subjects);
      });
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto print:p-0">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Sub Day Packet</h1>
        <button onClick={() => window.print()} className="btn-primary px-4 py-2">
          Print Packet
        </button>
      </div>

      <div className="mb-4 print:hidden">
        <PeriodPicker sections={sections} value={periodId} onChange={setPeriodId} label="Period:" />
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
          {visibleStudents.map((s) => {
            const hasSafetyInfo = s.allergies.length > 0 || s.dietaryRestrictions.length > 0;
            const hasIep = s.hasIep;
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
                    Has an IEP/504 plan — see classroom teacher for details.
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
