"use client";

import { useState } from "react";

type Parent = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  isEmergencyContact: boolean;
};

export default function EditParents({
  studentId,
  parents,
  onChanged,
}: {
  studentId: string;
  parents: Parent[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Parent/Guardian");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isEmergencyContact, setIsEmergencyContact] = useState(true);

  async function add() {
    if (!name.trim()) return;
    await fetch(`/api/students/${studentId}/parents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        relationship,
        phone,
        email,
        preferredContact: email ? "email" : "phone",
        isEmergencyContact,
      }),
    });
    setName("");
    setPhone("");
    setEmail("");
    onChanged();
  }

  async function remove(id: string) {
    await fetch(`/api/students/${studentId}/parents?parentId=${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="panel space-y-2">
      {parents.map((p) => (
        <div key={p.id} className="flex justify-between items-start text-sm border-b pb-1">
          <span>
            {p.name} ({p.relationship}) — {p.phone ?? "—"} / {p.email ?? "—"}
            {p.isEmergencyContact && " 🚨"}
          </span>
          <button onClick={() => remove(p.id)} className="text-rose-600 text-xs whitespace-nowrap ml-2">
            Remove
          </button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="Relationship"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isEmergencyContact}
          onChange={(e) => setIsEmergencyContact(e.target.checked)}
        />
        Emergency contact
      </label>
      <button onClick={add} className="btn-primary w-full">
        Add Parent/Guardian
      </button>
    </div>
  );
}
