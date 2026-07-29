"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  seatingAssignment: { posX: number; posY: number } | null;
};
type Relationship = { studentId: string; relatedStudentId: string };
type Seat = { id: string; row: number; col: number };

export default function SeatingChartPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [conflicts, setConflicts] = useState<Relationship[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    Promise.all([
      fetch("/api/seating").then((r) => r.json()),
      fetch("/api/seating/layout").then((r) => r.json()),
    ]).then(([seatingData, layoutData]) => {
      setStudents(seatingData.students);
      setConflicts(seatingData.relationships);
      setSeats(layoutData.seats ?? []);
    });
  }

  function studentAt(x: number, y: number) {
    return students.find(
      (s) => s.seatingAssignment?.posX === x && s.seatingAssignment?.posY === y
    );
  }

  async function handleSeatClick(row: number, col: number) {
    const occupant = studentAt(col, row);

    if (!selectedStudentId) {
      if (occupant) setSelectedStudentId(occupant.id);
      return;
    }

    if (occupant && occupant.id === selectedStudentId) {
      setSelectedStudentId("");
      return;
    }

    if (occupant) {
      await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          posX: col,
          posY: row,
          swapWithStudentId: occupant.id,
        }),
      });
    } else {
      await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId, posX: col, posY: row }),
      });
    }
    setSelectedStudentId("");
    load();
  }

  async function unseatSelected() {
    if (!selectedStudentId) return;
    await fetch(`/api/seating?studentId=${selectedStudentId}`, { method: "DELETE" });
    setSelectedStudentId("");
    load();
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
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const maxRow = seats.reduce((m, s) => Math.max(m, s.row), 0);
  const maxCol = seats.reduce((m, s) => Math.max(m, s.col), 0);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-2xl font-bold">Seating Chart</h1>
        <Link href="/seating/layout" className="btn-outline text-sm">
          Design Layout →
        </Link>
      </div>

      {seats.length === 0 ? (
        <p className="text-slate-500">
          No seats set up yet.{" "}
          <Link href="/seating/layout" className="underline text-sky-600">
            Design your room's layout
          </Link>{" "}
          to get started - choose rows, groups/pods, or place seats manually.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <label className="text-sm">Select a student to place or move:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">Choose student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName}
                  {s.seatingAssignment ? " (seated)" : ""}
                </option>
              ))}
            </select>
            {selectedStudent?.seatingAssignment && (
              <button onClick={unseatSelected} className="btn-outline text-sm">
                Remove {selectedStudent.firstName} from seat
              </button>
            )}
          </div>

          <p className="text-sm text-slate-500 mb-3">
            Pick a student above (or click any occupied seat to pick them up), then click a seat
            to place them. Clicking an occupied seat while someone's selected swaps the two.
          </p>

          <div className="space-y-1 overflow-x-auto">
            {Array.from({ length: maxRow + 1 }).map((_, row) => {
              const rowSeats = seats.filter((s) => s.row === row).sort((a, b) => a.col - b.col);
              if (rowSeats.length === 0) {
                // Fully empty row - this is a walkway between rows of desks
                // (e.g. between two rows of pods). Render a visible
                // horizontal divider instead of just collapsing the gap.
                return (
                  <div key={row} className="h-4 flex items-center">
                    <div className="w-full h-0.5 bg-violet-200" />
                  </div>
                );
              }
              return (
                <div key={row} className="flex gap-1">
                  {Array.from({ length: maxCol + 1 }).map((_, col) => {
                    const seat = rowSeats.find((s) => s.col === col);
                    if (!seat) {
                      // Gap in this row - render as a walkway with a visible
                      // vertical divider line, instead of just blank space.
                      return (
                        <div key={col} className="w-20 h-16 shrink-0 flex justify-center">
                          <div className="w-0.5 h-full bg-violet-200" />
                        </div>
                      );
                    }
                    const student = studentAt(col, row);
                    const conflictWarning = student && isConflictAdjacent(student, col, row);
                    const isSelected = student?.id === selectedStudentId;
                    return (
                      <button
                        key={col}
                        onClick={() => handleSeatClick(row, col)}
                        className={`h-16 w-20 border rounded text-xs flex items-center justify-center p-1 text-center shrink-0 ${
                          conflictWarning
                            ? "border-rose-400 bg-rose-50"
                            : isSelected
                            ? "border-sky-400 bg-sky-50"
                            : "bg-white hover:bg-violet-50"
                        }`}
                      >
                        {student ? `${student.firstName} ${student.lastName[0]}.` : "+"}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <p className="text-sm text-slate-500 mt-4">
            Seats outlined in red are next to a student marked "does not work well with" the
            student seated there — worth a second look.
          </p>

          {unplaced.length > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              Not yet seated: {unplaced.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
