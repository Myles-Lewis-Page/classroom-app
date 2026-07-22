"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Seat = { id: string; row: number; col: number };

export default function SeatingLayoutPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [canvasRows, setCanvasRows] = useState(8);
  const [canvasCols, setCanvasCols] = useState(10);
  const [canvasRowsInput, setCanvasRowsInput] = useState("8");
  const [canvasColsInput, setCanvasColsInput] = useState("10");

  // Rows template
  const [rowsCount, setRowsCount] = useState("5");
  const [colsCount, setColsCount] = useState("6");
  const [rowWalkways, setRowWalkways] = useState<Set<number>>(new Set());
  const [colWalkways, setColWalkways] = useState<Set<number>>(new Set());

  // Groups template
  const [groupCount, setGroupCount] = useState("6");
  const [seatsPerGroup, setSeatsPerGroup] = useState("4");
  const [groupsPerRow, setGroupsPerRow] = useState("3");

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/seating/layout")
      .then((r) => r.json())
      .then(({ seats, canvasRows, canvasCols }) => {
        setSeats(seats);
        setCanvasRows(canvasRows);
        setCanvasCols(canvasCols);
        setCanvasRowsInput(String(canvasRows));
        setCanvasColsInput(String(canvasCols));
      });
  }

  async function saveCanvasSize() {
    await fetch("/api/seating/canvas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parseInt(canvasRowsInput), cols: parseInt(canvasColsInput) }),
    });
    load();
  }

  function toggleWalkway(set: Set<number>, setSet: (s: Set<number>) => void, n: number) {
    const next = new Set(set);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSet(next);
  }

  async function generateRows(confirm = false) {
    const res = await fetch("/api/seating/layout/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "rows",
        rows: parseInt(rowsCount) || 5,
        cols: parseInt(colsCount) || 6,
        rowWalkways: Array.from(rowWalkways),
        colWalkways: Array.from(colWalkways),
        confirm,
      }),
    });
    await handleGenerateResponse(res, () => generateRows(true));
  }

  async function generateGroups(confirm = false) {
    const res = await fetch("/api/seating/layout/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "groups",
        groupCount: parseInt(groupCount) || 4,
        seatsPerGroup: parseInt(seatsPerGroup) || 4,
        groupsPerRow: parseInt(groupsPerRow) || 2,
        confirm,
      }),
    });
    await handleGenerateResponse(res, () => generateGroups(true));
  }

  async function handleGenerateResponse(res: Response, retryConfirmed: () => void) {
    if (res.status === 409) {
      const data = await res.json();
      if (window.confirm(`${data.message}\n\nApply this layout anyway?`)) {
        retryConfirmed();
      }
      return;
    }
    load();
  }

  async function toggleManualSeat(row: number, col: number) {
    const existing = seats.find((s) => s.row === row && s.col === col);
    if (existing) {
      const res = await fetch(`/api/seating/layout?seatId=${existing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Couldn't remove that seat.");
        return;
      }
    } else {
      await fetch("/api/seating/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col }),
      });
    }
    load();
  }

  function seatAt(row: number, col: number) {
    return seats.find((s) => s.row === row && s.col === col);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/seating" className="text-sky-600 text-sm hover:underline">
        ← Back to Seating Chart
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Seating Layout</h1>
      <p className="text-slate-500 mb-4">
        Design the room here - rows, groups/pods, or click cells manually. The Seating Chart page
        only places students into whatever seats exist here.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Rows template */}
        <div className="panel">
          <h2 className="font-semibold mb-2">Rows Template</h2>
          <div className="flex gap-2 mb-2">
            <div>
              <label className="block text-xs text-slate-500">Rows</label>
              <input
                type="number"
                min={1}
                value={rowsCount}
                onChange={(e) => setRowsCount(e.target.value)}
                className="border rounded px-2 py-1 w-16"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Columns</label>
              <input
                type="number"
                min={1}
                value={colsCount}
                onChange={(e) => setColsCount(e.target.value)}
                className="border rounded px-2 py-1 w-16"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">
            Tap a row/column number below to leave it empty as a walkway:
          </p>
          <div className="flex flex-wrap gap-1 mb-1">
            <span className="text-xs text-slate-500 w-14">Row aisle:</span>
            {Array.from({ length: parseInt(rowsCount) || 0 }).map((_, r) => (
              <button
                key={r}
                onClick={() => toggleWalkway(rowWalkways, setRowWalkways, r)}
                className={`w-6 h-6 text-xs rounded border ${
                  rowWalkways.has(r) ? "bg-amber-200" : "bg-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-slate-500 w-14">Col aisle:</span>
            {Array.from({ length: parseInt(colsCount) || 0 }).map((_, c) => (
              <button
                key={c}
                onClick={() => toggleWalkway(colWalkways, setColWalkways, c)}
                className={`w-6 h-6 text-xs rounded border ${
                  colWalkways.has(c) ? "bg-amber-200" : "bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => generateRows()} className="btn-primary w-full">
            Generate Rows Layout
          </button>
        </div>

        {/* Groups template */}
        <div className="panel">
          <h2 className="font-semibold mb-2">Groups Template</h2>
          <div className="flex gap-2 mb-3 flex-wrap">
            <div>
              <label className="block text-xs text-slate-500">Number of groups</label>
              <input
                type="number"
                min={1}
                value={groupCount}
                onChange={(e) => setGroupCount(e.target.value)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Seats per group</label>
              <input
                type="number"
                min={1}
                max={8}
                value={seatsPerGroup}
                onChange={(e) => setSeatsPerGroup(e.target.value)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Groups per row</label>
              <input
                type="number"
                min={1}
                value={groupsPerRow}
                onChange={(e) => setGroupsPerRow(e.target.value)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
          </div>
          <button onClick={() => generateGroups()} className="btn-primary w-full">
            Generate Groups Layout
          </button>
        </div>
      </div>

      <div className="panel mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500">Canvas rows (editing area)</label>
          <input
            type="number"
            min={1}
            value={canvasRowsInput}
            onChange={(e) => setCanvasRowsInput(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Canvas columns</label>
          <input
            type="number"
            min={1}
            value={canvasColsInput}
            onChange={(e) => setCanvasColsInput(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <button onClick={saveCanvasSize} className="btn-outline">
          Resize Canvas
        </button>
      </div>

      <h2 className="font-semibold mb-2">Manual Editing</h2>
      <p className="text-sm text-slate-500 mb-3">
        Click any cell to add or remove a seat there directly.
      </p>
      <div className="overflow-x-auto">
        <div className="inline-block space-y-1">
          {Array.from({ length: canvasRows }).map((_, r) => (
            <div key={r} className="flex gap-1">
              {Array.from({ length: canvasCols }).map((_, c) => {
                const seat = seatAt(r, c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleManualSeat(r, c)}
                    className={`w-8 h-8 text-xs rounded border shrink-0 ${
                      seat ? "bg-sky-200 border-sky-400" : "bg-white hover:bg-violet-50"
                    }`}
                    title={seat ? "Remove seat" : "Add seat"}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
