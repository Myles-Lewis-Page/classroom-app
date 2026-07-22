"use client";

import { useEffect, useState } from "react";
import { calculateRating, ratingColor } from "@/lib/behaviorRating";

type Student = { id: string; firstName: string; lastName: string };
type Subject = { id: string; name: string; icon: string | null; order: number };
type Flags = {
  calmBody: boolean;
  listeningEars: boolean;
  kindWords: boolean;
  stayInArea: boolean;
  finishedWork: boolean;
  none: boolean;
  comment: string;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<Record<string, Flags>>({}); // keyed by subjectId
  const [classroomId, setClassroomId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    loadSubjects();
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? ""));
  }, []);

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

  useEffect(() => {
    if (!selectedStudent) return;
    // reset local state to empty per subject; a real build would fetch existing entries for this student/date
    const fresh: Record<string, Flags> = {};
    subjects.forEach((s) => (fresh[s.id] = { ...emptyFlags }));
    setEntries(fresh);
  }, [selectedStudent, date, subjects]);

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

      <div className="flex gap-3 mb-6">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border rounded px-2 py-1"
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
              <button
                onClick={() => save(subject.id)}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          );
        })}
    </div>
  );
}
