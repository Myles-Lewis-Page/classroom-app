"use client";

import { useEffect, useState } from "react";

type SupportOption = { id: string; label: string };
type SupportType = { id: string; name: string; options: SupportOption[] };
type StudentSupport = {
  supportTypeId: string;
  selectedOptionId: string | null;
  supportType: { name: string };
  selectedOption: { label: string } | null;
};

export default function EditSupports({
  studentId,
  currentSupports,
  onChanged,
}: {
  studentId: string;
  currentSupports: StudentSupport[];
  onChanged: () => void;
}) {
  const [allTypes, setAllTypes] = useState<SupportType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTypes();
  }, []);

  function loadTypes() {
    fetch("/api/support-types")
      .then((r) => r.json())
      .then(setAllTypes);
  }

  const currentByType = new Map(currentSupports.map((s) => [s.supportTypeId, s]));

  async function toggleSupport(type: SupportType, checked: boolean) {
    if (checked) {
      await fetch("/api/supports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, supportTypeId: type.id }),
      });
    } else {
      await fetch(`/api/supports?studentId=${studentId}&supportTypeId=${type.id}`, {
        method: "DELETE",
      });
    }
    onChanged();
  }

  async function setOption(type: SupportType, optionId: string) {
    await fetch("/api/supports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, supportTypeId: type.id, selectedOptionId: optionId || null }),
    });
    onChanged();
  }

  async function addSupportType() {
    if (!newTypeName.trim()) return;
    await fetch("/api/support-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName.trim() }),
    });
    setNewTypeName("");
    loadTypes();
  }

  async function removeSupportType(typeId: string) {
    if (!confirm("Remove this support entirely for all students? This can't be undone.")) return;
    await fetch(`/api/support-types?typeId=${typeId}`, { method: "DELETE" });
    loadTypes();
    onChanged();
  }

  async function addOption(type: SupportType) {
    const label = (newOptionLabel[type.id] || "").trim();
    if (!label) return;
    await fetch("/api/support-types/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supportTypeId: type.id, label }),
    });
    setNewOptionLabel((prev) => ({ ...prev, [type.id]: "" }));
    loadTypes();
  }

  return (
    <div className="panel space-y-3">
      {allTypes.length === 0 && (
        <p className="text-sm text-slate-500">
          No supports set up yet for this classroom - add one below (e.g. Para Support,
          Classification, Personal Supports, Behavior Supports).
        </p>
      )}
      {allTypes.map((type) => {
        const current = currentByType.get(type.id);
        const checked = !!current;
        return (
          <div key={type.id} className="border-b pb-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleSupport(type, e.target.checked)}
                />
                {type.name}
              </label>
              <button
                onClick={() => removeSupportType(type.id)}
                className="text-rose-600 text-xs hover:underline"
              >
                Remove support
              </button>
            </div>

            {checked && type.options.length > 0 && (
              <select
                value={current?.selectedOptionId ?? ""}
                onChange={(e) => setOption(type, e.target.value)}
                className="border rounded px-2 py-1 text-sm mt-1"
              >
                <option value="">Select...</option>
                {type.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2 mt-1">
              <input
                placeholder="Add dropdown option (optional)"
                value={newOptionLabel[type.id] || ""}
                onChange={(e) =>
                  setNewOptionLabel((prev) => ({ ...prev, [type.id]: e.target.value }))
                }
                className="border rounded px-2 py-1 text-xs flex-1"
              />
              <button onClick={() => addOption(type)} className="text-xs text-sky-600 hover:underline">
                Add option
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <input
          placeholder="Add a new support (e.g. Para Support)"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <button onClick={addSupportType} className="btn-primary text-sm">
          Add Support
        </button>
      </div>
    </div>
  );
}
