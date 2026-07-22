"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  seatingAssignment: { posX: number; posY: number } | null;
};
type Relationship = { studentId: string; relatedStudentId: string };

const GRID_COLS = 6;
const GRID_ROWS = 5;

export default function SeatingChartPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [conflicts, setConflicts] = useState<Relationship[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/seating")
      .then((r) => r.json())
      .then(({ students, relationships }) => {
        setStudents(students);
        setConflicts(relationships);
      });
  }

  async function placeAt(x: number, y: number) {
    if (!selectedStudent) return;
    await fetch("/api/seating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudent, posX: x, posY: y }),
    });
    setSelectedStudent("");
    load();
  }

  function studentAt(x: number, y: number) {
    return students.find(
      (s) => s.seatingAssignment?.posX === x && s.seatingAssignment?.posY === y
    );
  }

  function isConflictAdjacent(student: Student, x: number, y: number): boolean {
    const conflictIds = conflicts
      .filter((c) => c.studentId === student.id || c.relatedStudentId === student.id)
      .map((c) => (c.studentId === student.id ? c.relatedStudentId : c.studentId));

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    return neighbors.some(([nx, ny]) => {
      const neighbor = studentAt(nx, ny);
      return neighbor && conflictIds.includes(neighbor.id);
    });
  }

  const unplaced = students.filter((s) => !s.seatingAssignment);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Seating Chart</h1>

      <div className="mb-4">
        <label className="text-sm mr-2">Select a student, then click a desk:</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Choose student...</option>
          {unplaced.map((s) => (
            <option key={s.id} value={s.id}>
              {s.lastName}, {s.firstName}
            </option>
          ))}
        </select>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: GRID_ROWS }).map((_, y) =>
          Array.from({ length: GRID_COLS }).map((_, x) => {
            const student = studentAt(x, y);
            const conflictWarning = student && isConflictAdjacent(student, x, y);
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => placeAt(x, y)}
                className={`h-16 border rounded text-xs flex items-center justify-center p-1 text-center ${
                  conflictWarning ? "border-rose-300 bg-rose-50" : "bg-white hover:bg-violet-50/40"
                }`}
              >
                {student ? `${student.firstName} ${student.lastName[0]}.` : "+"}
              </button>
            );
          })
        )}
      </div>
      <p className="text-sm text-gray-500 mt-3">
        Desks outlined in red seat two students marked "does not work well with" each other
        right next to one another — worth a second look.
      </p>
    </div>
  );
}
