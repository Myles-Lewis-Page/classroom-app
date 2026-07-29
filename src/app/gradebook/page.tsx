"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Student = { id: string; firstName: string; lastName: string };
type SkillSubject = { id: string; name: string };
type Entry = {
  status: string;
  gradeStatus: string | null;
  gradeScore: number | null;
  student: { id: string };
};
type Assignment = {
  id: string;
  name: string;
  assignedDate: string;
  gradingType: string;
  maxPoints: number | null;
  skillSubjectId: string | null;
  entries: Entry[];
};

export default function GradebookPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    fetch("/api/skill-subjects").then((r) => r.json()).then(setSubjects);
    fetch("/api/assignments").then((r) => r.json()).then(setAssignments);
  }, []);

  const visibleAssignments =
    selectedSubjectId === "all"
      ? assignments
      : assignments.filter((a) => a.skillSubjectId === selectedSubjectId);

  function entryFor(assignment: Assignment, studentId: string) {
    return assignment.entries.find((e) => e.student.id === studentId);
  }

  function cellDisplay(assignment: Assignment, entry: Entry | undefined) {
    if (!entry) return { text: "—", color: "#f5f3ff" };
    if (assignment.gradingType === "points") {
      if (entry.gradeScore === null) return { text: "—", color: "#f5f3ff" };
      const pct = assignment.maxPoints ? entry.gradeScore / assignment.maxPoints : 0;
      const color = pct >= 0.9 ? "#a7f3d0" : pct >= 0.7 ? "#fde68a" : "#fecaca";
      return { text: `${entry.gradeScore}/${assignment.maxPoints}`, color };
    }
    if (entry.gradeStatus === "complete") return { text: "Complete", color: "#a7f3d0" };
    if (entry.gradeStatus === "incomplete") return { text: "Incomplete", color: "#fecaca" };
    return { text: "Not graded", color: "#f5f3ff" };
  }

  function studentAverage(studentId: string) {
    let earned = 0;
    let possible = 0;
    visibleAssignments
      .filter((a) => a.gradingType === "points")
      .forEach((a) => {
        const entry = entryFor(a, studentId);
        if (entry && entry.gradeScore !== null && a.maxPoints) {
          earned += entry.gradeScore;
          possible += a.maxPoints;
        }
      });
    return possible > 0 ? Math.round((earned / possible) * 100) : null;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Gradebook</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedSubjectId("all")}
          className={`px-3 py-1 rounded text-sm ${
            selectedSubjectId === "all" ? "btn-primary" : "bg-white border"
          }`}
        >
          All Subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSubjectId(s.id)}
            className={`px-3 py-1 rounded text-sm ${
              selectedSubjectId === s.id ? "btn-primary" : "bg-white border"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {visibleAssignments.length === 0 ? (
        <p className="text-slate-500">
          No assignments yet.{" "}
          <Link href="/homework" className="underline text-sky-600">
            Create one on the Homework page
          </Link>{" "}
          to see it here.
        </p>
      ) : (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-white sticky left-0">Student</th>
              {visibleAssignments.map((a) => (
                <th key={a.id} className="border p-2 bg-white whitespace-nowrap">
                  <Link href={`/homework/${a.id}`} className="text-sky-600 hover:underline">
                    {a.name}
                  </Link>
                  <br />
                  <span className="text-xs text-slate-400">
                    {new Date(a.assignedDate).toLocaleDateString()}
                  </span>
                </th>
              ))}
              <th className="border p-2 bg-white whitespace-nowrap">Average</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const avg = studentAverage(student.id);
              return (
                <tr key={student.id}>
                  <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                    {student.lastName}, {student.firstName}
                  </td>
                  {visibleAssignments.map((a) => {
                    const entry = entryFor(a, student.id);
                    const { text, color } = cellDisplay(a, entry);
                    return (
                      <td key={a.id} className="border p-1 text-center">
                        <span
                          className="inline-block px-2 py-1 rounded text-xs whitespace-nowrap"
                          style={{ backgroundColor: color }}
                        >
                          {text}
                        </span>
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center font-medium">
                    {avg !== null ? `${avg}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
