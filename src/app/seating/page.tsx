"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  seatingAssignment: { posX: number; posY: number } | null;
};
type Relationship = { studentId: string; relatedStudentId: string };
type ExtraSeat = { id: string; row: number; col: number };

export default function SeatingChartPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [conflicts, setConflicts] = useState<Relationship[]>([]);
  const [extraSeats, setExtraSeats] = useState<ExtraSeat[]>([]);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [rowsInput, setRowsInput] = useState("5");
  const [colsInput, setColsInput] = useState("6");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/seating")
      .then((r) => r.json())
      .then(({ students, relationships, seatingRows, seatingCols, extraSeats }) => {
        setStudents(students);
        setConflicts(relationships);
        setRows(seatingRows);
        setCols(seatingCols);
        setRowsInput(String(seatingRows));
        setColsInput(String(seatingCols));
        setExtraSeats(extraSeats ?? []);
      });
  }

  async function saveGridSize() {
    const r = parseInt(rowsInput) || 5;
    const c = parseInt(colsInput) || 6;
    await fetch("/api/seating/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: r, cols: c }),
    });
    load();
  }

  async function addExtraSeat(row: number) {
    await fetch("/api/seating/extra-seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row }),
    });
    load();
  }

  async function removeExtraSeat(seatId: string) {
    const res = await fetch(`/api/seating/extra-seats?seatId=${seatId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Couldn't remove that seat.");
      return;
    }
    load();
  }

  function studentAt(x: number, y: number) {
    return students.find(
      (s) => s.seatingAssignment?.posX === x && s.seatingAssignment?.posY === y
    );
  }

  async function handleDeskClick(x: number, y: number) {
    const occupant = studentAt(x, y);

    if (!selectedStudentId) {
      // Nothing selected yet: clicking an occupied desk "picks up" that
      // student so the next click can move them; clicking empty does nothing.
      if (occupant) setSelectedStudentId(occupant.id);
      return;
    }

    if (occupant && occupant.id === selectedStudentId) {
      // Clicked the seat the selected student is already in - just deselect.
      setSelectedStudentId("");
      return;
    }

    if (occupant) {
      // Desk is occupied by someone else - swap the two students' seats.
      await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          posX: x,
          posY: y,
          swapWithStudentId: occupant.id,
        }),
      });
    } else {
      await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId, posX: x, posY: y }),
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

  // Build the seat list per row: base columns 0..cols-1, plus any extra
  // seats for that row appended after (for rows that aren't perfectly square).
  const extraByRow = new Map<number, ExtraSeat[]>();
  extraSeats.forEach((s) => {
    if (!extraByRow.has(s.row)) extraByRow.set(s.row, []);
    extraByRow.get(s.row)!.push(s);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Seating Chart</h1>

      <div className="panel mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rows</label>
          <input
            type="number"
            min={1}
            max={20}
            value={rowsInput}
            onChange={(e) => setRowsInput(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Columns</label>
          <input
            type="number"
            min={1}
            max={20}
            value={colsInput}
            onChange={(e) => setColsInput(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <button onClick={saveGridSize} className="btn-primary">
          Save Grid Size
        </button>
      </div>

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
        Pick a student above (or click any occupied desk to pick them up), then click a desk to
        place them. Clicking an occupied desk while someone's selected swaps the two.
      </p>

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, y) => {
          const rowExtras = extraByRow.get(y) ?? [];
          return (
            <div key={y} className="flex gap-2 items-center">
              {Array.from({ length: cols }).map((_, x) => {
                const student = studentAt(x, y);
                const conflictWarning = student && isConflictAdjacent(student, x, y);
                const isSelected = student?.id === selectedStudentId;
                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleDeskClick(x, y)}
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
              {rowExtras.map((seat) => {
                const student = studentAt(seat.col, seat.row);
                const conflictWarning = student && isConflictAdjacent(student, seat.col, seat.row);
                const isSelected = student?.id === selectedStudentId;
                return (
                  <div key={seat.id} className="relative shrink-0">
                    <button
                      onClick={() => handleDeskClick(seat.col, seat.row)}
                      className={`h-16 w-20 border-2 border-dashed rounded text-xs flex items-center justify-center p-1 text-center ${
                        conflictWarning
                          ? "border-rose-400 bg-rose-50"
                          : isSelected
                          ? "border-sky-400 bg-sky-50"
                          : "bg-amber-50 hover:bg-amber-100"
                      }`}
                      title="Extra seat"
                    >
                      {student ? `${student.firstName} ${student.lastName[0]}.` : "+ extra"}
                    </button>
                    {!student && (
                      <button
                        onClick={() => removeExtraSeat(seat.id)}
                        className="absolute -top-2 -right-2 bg-white border rounded-full w-5 h-5 text-xs text-rose-600 leading-none"
                        title="Remove this extra seat"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => addExtraSeat(y)}
                className="h-16 w-10 border border-dashed rounded text-slate-400 hover:text-sky-600 hover:border-sky-400 shrink-0"
                title="Add an extra seat to this row"
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-slate-500 mt-4">
        Desks outlined in red seat two students marked "does not work well with" each other right
        next to one another — worth a second look. Dashed amber desks are extra seats added beyond
        the base grid.
      </p>

      {unplaced.length > 0 && (
        <p className="text-sm text-slate-500 mt-2">
          Not yet seated: {unplaced.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
        </p>
      )}
    </div>
  );
}
