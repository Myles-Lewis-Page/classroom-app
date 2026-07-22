"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tag = { id: string; name: string };

export default function AddStudentPage() {
  const router = useRouter();
  const [classroomId, setClassroomId] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [dob, setDob] = useState("");
  const [understandingLevel, setUnderstandingLevel] = useState("3");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [reaction, setReaction] = useState("");
  const [dietary, setDietary] = useState("");

  const [iepType, setIepType] = useState("");
  const [accommodations, setAccommodations] = useState("");
  const [caseManager, setCaseManager] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const [parentName, setParentName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("Parent/Guardian");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [isEmergencyContact, setIsEmergencyContact] = useState(true);

  useEffect(() => {
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? ""));
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !grade || !classroomId) return;
    setSaving(true);

    const payload = {
      classroomId,
      firstName,
      lastName,
      grade,
      section,
      dob: dob || null,
      understandingLevel,
      tagIds: selectedTagIds,
      allergies: allergen ? [{ allergen, severity, reaction }] : [],
      dietaryRestrictions: dietary ? [{ restriction: dietary }] : [],
      ieps: iepType ? [{ type: iepType, accommodations, caseManager, reviewDate }] : [],
      parents: parentName
        ? [
            {
              name: parentName,
              relationship: parentRelationship,
              phone: parentPhone,
              email: parentEmail,
              preferredContact: parentEmail ? "email" : "phone",
              isEmergencyContact,
            },
          ]
        : [],
    };

    const res = await fetch("/api/students/full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      router.push("/roster");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Student</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card">
          <h2 className="font-semibold mb-3">Basic Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
            <input
              placeholder="Grade (e.g. 3rd)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
            <input
              placeholder="Section (optional)"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <div>
              <label className="block text-xs text-gray-500">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Understanding level (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={understandingLevel}
                onChange={(e) => setUnderstandingLevel(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    selectedTagIds.includes(t.id) ? "bg-sky-200 text-slate-800" : "bg-white"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-2 border-rose-200 rounded p-4">
          <h2 className="font-semibold mb-3 text-rose-700">⚠️ Allergies & Dietary (optional)</h2>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <input
              placeholder="Allergen (e.g. peanuts)"
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <input
            placeholder="Reaction notes"
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            className="border rounded px-2 py-1 w-full mb-2"
          />
          <input
            placeholder="Dietary restriction (e.g. vegetarian)"
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3">IEP / 504 (optional)</h2>
          <select
            value={iepType}
            onChange={(e) => setIepType(e.target.value)}
            className="border rounded px-2 py-1 mb-2 w-full"
          >
            <option value="">None</option>
            <option value="IEP">IEP</option>
            <option value="504">504</option>
          </select>
          {iepType && (
            <>
              <textarea
                placeholder="Accommodations"
                value={accommodations}
                onChange={(e) => setAccommodations(e.target.value)}
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Case manager"
                  value={caseManager}
                  onChange={(e) => setCaseManager(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </div>
            </>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3">Parent / Guardian (optional)</h2>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <input
              placeholder="Name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <input
              placeholder="Relationship"
              value={parentRelationship}
              onChange={(e) => setParentRelationship(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <input
              placeholder="Phone"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <input
              placeholder="Email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="border rounded px-2 py-1"
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
        </section>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-4 py-2 w-full"
        >
          {saving ? "Saving..." : "Add Student"}
        </button>
      </form>
    </div>
  );
}
