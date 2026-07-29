"use client";

import { useEffect, useState, useMemo } from "react";
import { calculateRating, ratingColor } from "@/lib/behaviorRating";
import PieChart from "@/components/PieChart";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

type Student = { id: string; firstName: string; lastName: string; sectionId: string | null };
type Subject = { id: string; name: string; icon: string | null; order: number };
type Parent = { name: string; relationship: string; phone: string | null; email: string | null };
type Flags = {
  calmBody: boolean;
  listeningEars: boolean;
  kindWords: boolean;
  stayInArea: boolean;
  finishedWork: boolean;
  none: boolean;
  comment: string;
};
type BehaviorEntry = {
  studentId: string;
  subjectId: string;
  rating: string | null;
  comment: string | null;
  calmBody: boolean;
  listeningEars: boolean;
  kindWords: boolean;
  stayInArea: boolean;
  finishedWork: boolean;
  none: boolean;
};

const emptyFlags: Flags = {
  calmBody: false,
  listeningEars: false,
  kindWords: false,
  stayInArea: false,
  finishedWork: false,
  none: false,
  comment: "",
};

export default function BehaviorLogPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedParents, setSelectedParents] = useState<Parent[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<Record<string, Flags>>({}); // keyed by subjectId
  const [dayEntries, setDayEntries] = useState<BehaviorEntry[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    loadSubjects();
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? ""));
  }, []);

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  function loadSubjects() {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }

  async function addSubject() {
    if (!newSubjectName.trim() || !classroomId) return;
    await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        name: newSubjectName.trim(),
        order: subjects.length,
      }),
    });
    setNewSubjectName("");
    loadSubjects();
  }

  // Load the whole class's entries for the selected date - powers the data
  // table and pie chart, and also lets us pre-fill the form for whichever
  // student is selected instead of always starting blank.
  useEffect(() => {
    fetch(`/api/behavior?date=${date}`)
      .then((r) => r.json())
      .then((data: (BehaviorEntry & { subject: Subject })[]) => setDayEntries(data));
  }, [date]);

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedParents([]);
      return;
    }
    fetch(`/api/students/${selectedStudent}`)
      .then((r) => r.json())
      .then((s) => setSelectedParents(s.parents ?? []));

    const fresh: Record<string, Flags> = {};
    subjects.forEach((s) => {
      const existing = dayEntries.find(
        (e) => e.studentId === selectedStudent && e.subjectId === s.id
      );
      fresh[s.id] = existing
        ? {
            calmBody: existing.calmBody,
            listeningEars: existing.listeningEars,
            kindWords: existing.kindWords,
            stayInArea: existing.stayInArea,
            finishedWork: existing.finishedWork,
            none: existing.none,
            comment: existing.comment ?? "",
          }
        : { ...emptyFlags };
    });
    setEntries(fresh);
  }, [selectedStudent, date, subjects, dayEntries]);

  function toggle(subjectId: string, key: keyof Flags) {
    setEntries((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [key]: !prev[subjectId][key] },
    }));
  }

  async function save(subjectId: string) {
    const flags = entries[subjectId];
    await fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudent,
        subjectId,
        date,
        ...flags,
      }),
    });
    fetch(`/api/behavior?date=${date}`)
      .then((r) => r.json())
      .then(setDayEntries);
  }

  const ruleKeys: (keyof Flags)[] = [
    "calmBody",
    "listeningEars",
    "kindWords",
    "stayInArea",
    "finishedWork",
  ];
  const ruleLabels: Record<string, string> = {
    calmBody: "Calm Body",
    listeningEars: "Listening Ears",
    kindWords: "Kind Words",
    stayInArea: "Stay in Area",
    finishedWork: "Finished Work",
  };

  // Bucket each student into Good/Medium/Bad for the day based on the most
  // common rating among their entries that day.
  const dayBuckets = { good: 0, medium: 0, bad: 0 };
  const studentIdsWithEntries = Array.from(new Set(dayEntries.map((e) => e.studentId)));
  studentIdsWithEntries.forEach((sid) => {
    const ratings = dayEntries.filter((e) => e.studentId === sid && e.rating).map((e) => e.rating);
    if (ratings.length === 0) return;
    const counts = { green: 0, yellow: 0, red: 0 };
    ratings.forEach((r) => {
      if (r && r in counts) counts[r as keyof typeof counts]++;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    if (top === "green") dayBuckets.good++;
    else if (top === "yellow") dayBuckets.medium++;
    else dayBuckets.bad++;
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Behavior Log</h1>

      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setShowScheduleBuilder((s) => !s)}
          className="text-sm text-sky-600 hover:underline"
        >
          {showScheduleBuilder ? "Hide" : "Edit"} Schedule / Subjects
        </button>
      </div>

      {showScheduleBuilder && (
        <div className="border rounded p-3 mb-4 flex gap-2 items-center">
          <input
            placeholder="New subject name (e.g. Science)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <button onClick={addSubject} className="btn-primary">
            Add Subject
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6 items-center flex-wrap">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Select student...</option>
          {visibleStudents.map((s) => (
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

      {/* Parent info - visible right away while logging, no need to go search */}
      {selectedStudent && selectedParents.length > 0 && (
        <div className="panel mb-4 text-sm">
          <p className="font-semibold mb-1">Parent/Guardian contact</p>
          {selectedParents.map((p, i) => (
            <p key={i}>
              {p.name} ({p.relationship}) — {p.phone ?? "no phone"} · {p.email ?? "no email"}
            </p>
          ))}
        </div>
      )}

      {selectedStudent && subjects.length === 0 && (
        <p className="text-gray-500">
          No subjects set up yet. Add subjects in the Schedule Builder to start logging.
        </p>
      )}

      {selectedStudent &&
        subjects.map((subject) => {
          const flags = entries[subject.id] ?? emptyFlags;
          const rating = flags.none ? null : calculateRating(flags);
          return (
            <div key={subject.id} className="border rounded p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">
                  {subject.icon} {subject.name}
                </h3>
                <span
                  className="w-4 h-4 rounded-full inline-block"
                  style={{ backgroundColor: ratingColor(rating) }}
                  title={rating ?? "not rated"}
                />
              </div>
              <div className="flex flex-wrap gap-3 mb-2">
                {ruleKeys.map((key) => (
                  <label key={key} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={flags[key] as boolean}
                      onChange={() => toggle(subject.id, key)}
                    />
                    {ruleLabels[key]}
                  </label>
                ))}
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={flags.none}
                    onChange={() => toggle(subject.id, "none")}
                  />
                  None
                </label>
              </div>
              <textarea
                placeholder="Comments..."
                value={flags.comment}
                onChange={(e) =>
                  setEntries((prev) => ({
                    ...prev,
                    [subject.id]: { ...prev[subject.id], comment: e.target.value },
                  }))
                }
                className="w-full border rounded px-2 py-1 text-sm mb-2"
              />
              <button onClick={() => save(subject.id)} className="btn-primary">
                Save
              </button>
            </div>
          );
        })}

      {/* Class data view for the selected date */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Class Overview — {date}</h2>

        {dayEntries.length === 0 ? (
          <p className="text-slate-500 text-sm mb-4">No behavior entries logged for this date yet.</p>
        ) : (
          <>
            <div className="panel mb-4">
              <PieChart
                slices={[
                  { label: "Good day", value: dayBuckets.good, color: "#a7f3d0" },
                  { label: "Medium day", value: dayBuckets.medium, color: "#fde68a" },
                  { label: "Bad day", value: dayBuckets.bad, color: "#fecaca" },
                ]}
              />
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Student</th>
                  <th>Entries logged</th>
                  <th>Ratings</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents
                  .filter((s) => dayEntries.some((e) => e.studentId === s.id))
                  .map((s) => {
                    const studentEntries = dayEntries.filter((e) => e.studentId === s.id);
                    return (
                      <tr key={s.id} className="border-b">
                        <td className="py-1">
                          {s.lastName}, {s.firstName}
                        </td>
                        <td>{studentEntries.length}</td>
                        <td>
                          <div className="flex gap-1">
                            {studentEntries.map((e, i) => (
                              <span
                                key={i}
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ backgroundColor: ratingColor(e.rating) }}
                                title={e.rating ?? "not rated"}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
