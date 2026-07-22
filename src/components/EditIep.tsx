"use client";

import { useState } from "react";

type Iep = {
  id: string;
  type: string;
  accommodations: string;
  caseManager: string | null;
  reviewDate: string | null;
};

export default function EditIep({
  studentId,
  ieps,
  onChanged,
}: {
  studentId: string;
  ieps: Iep[];
  onChanged: () => void;
}) {
  const [type, setType] = useState("IEP");
  const [accommodations, setAccommodations] = useState("");
  const [caseManager, setCaseManager] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  async function add() {
    if (!accommodations.trim()) return;
    await fetch(`/api/students/${studentId}/iep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, accommodations, caseManager, reviewDate }),
    });
    setAccommodations("");
    setCaseManager("");
    setReviewDate("");
    onChanged();
  }

  async function remove(id: string) {
    await fetch(`/api/students/${studentId}/iep?iepId=${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="panel space-y-2">
      {ieps.map((i) => (
        <div key={i.id} className="flex justify-between items-start text-sm border-b pb-1">
          <span>
            {i.type}: {i.accommodations}
            {i.caseManager && ` (Case mgr: ${i.caseManager})`}
          </span>
          <button onClick={() => remove(i.id)} className="text-rose-600 text-xs whitespace-nowrap ml-2">
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2 flex-wrap">
        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="IEP">IEP</option>
          <option value="504">504</option>
        </select>
        <input
          value={accommodations}
          onChange={(e) => setAccommodations(e.target.value)}
          placeholder="Accommodations"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <input
          value={caseManager}
          onChange={(e) => setCaseManager(e.target.value)}
          placeholder="Case manager"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <button onClick={add} className="btn-primary">
          Add
        </button>
      </div>
    </div>
  );
}
