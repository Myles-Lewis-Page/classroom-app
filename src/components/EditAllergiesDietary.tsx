"use client";

import { useState } from "react";

type Allergy = { id: string; allergen: string; severity: string; reaction: string | null };
type Dietary = { id: string; restriction: string; notes: string | null };

export default function EditAllergiesDietary({
  studentId,
  allergies,
  dietaryRestrictions,
  onChanged,
}: {
  studentId: string;
  allergies: Allergy[];
  dietaryRestrictions: Dietary[];
  onChanged: () => void;
}) {
  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [reaction, setReaction] = useState("");
  const [restriction, setRestriction] = useState("");

  async function addAllergy() {
    if (!allergen.trim()) return;
    await fetch(`/api/students/${studentId}/allergies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allergen: allergen.trim(), severity, reaction }),
    });
    setAllergen("");
    setReaction("");
    onChanged();
  }

  async function removeAllergy(id: string) {
    await fetch(`/api/students/${studentId}/allergies?allergyId=${id}`, { method: "DELETE" });
    onChanged();
  }

  async function addDietary() {
    if (!restriction.trim()) return;
    await fetch(`/api/students/${studentId}/dietary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restriction: restriction.trim() }),
    });
    setRestriction("");
    onChanged();
  }

  async function removeDietary(id: string) {
    await fetch(`/api/students/${studentId}/dietary?restrictionId=${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="panel space-y-3">
      <div>
        <p className="text-xs font-semibold mb-1">Current allergies</p>
        {allergies.map((a) => (
          <div key={a.id} className="flex justify-between items-center text-sm mb-1">
            <span>
              {a.allergen} ({a.severity}) {a.reaction && `— ${a.reaction}`}
            </span>
            <button onClick={() => removeAllergy(a.id)} className="text-rose-600 text-xs">
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <input
            value={allergen}
            onChange={(e) => setAllergen(e.target.value)}
            placeholder="Allergen"
            className="border rounded px-2 py-1 text-sm flex-1"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <input
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            placeholder="Reaction (optional)"
            className="border rounded px-2 py-1 text-sm flex-1"
          />
          <button onClick={addAllergy} className="btn-primary">
            Add
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1">Current dietary restrictions</p>
        {dietaryRestrictions.map((d) => (
          <div key={d.id} className="flex justify-between items-center text-sm mb-1">
            <span>{d.restriction}</span>
            <button onClick={() => removeDietary(d.id)} className="text-rose-600 text-xs">
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <input
            value={restriction}
            onChange={(e) => setRestriction(e.target.value)}
            placeholder="Dietary restriction"
            className="border rounded px-2 py-1 text-sm flex-1"
          />
          <button onClick={addDietary} className="btn-primary">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
