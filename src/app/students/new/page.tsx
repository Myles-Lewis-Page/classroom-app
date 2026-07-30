"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tag = { id: string; name: string };
type ClassroomOpt = { id: string; name: string; isArchived: boolean };
type SectionOpt = { id: string; name: string };

export default function AddStudentPage() {
  const router = useRouter();
  const [classroomId, setClassroomId] = useState("");
  const [classrooms, setClassrooms] = useState<ClassroomOpt[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [reaction, setReaction] = useState("");
  const [dietary, setDietary] = useState("");

  const [iepFields, setIepFields] = useState<
    Record<string, { accommodations: string; caseManager: string; reviewDate: string }>
  >({});

  const [parentName, setParentName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("Parent/Guardian");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [isEmergencyContact, setIsEmergencyContact] = useState(true);

  const [classroomLoading, setClassroomLoading] = useState(true);

  useEffect(() => {
    loadClassroom();
    fetch("/api/tags").then((r) => r.json()).then(setTags);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: { allClassrooms?: ClassroomOpt[] }) => {
        setClassrooms((data.allClassrooms || []).filter((c) => !c.isArchived));
      });
  }, []);

  // Whenever the chosen classroom changes, load that classroom's Periods -
  // a student can be tagged into any of the teacher's classrooms, so this
  // can't just rely on "the current classroom"'s Periods.
  useEffect(() => {
    if (!classroomId) {
      setSections([]);
      return;
    }
    fetch(`/api/sections?classroomId=${classroomId}`)
      .then((r) => r.json())
      .then(setSections)
      .catch(() => setSections([]));
    setSectionId("");
  }, [classroomId]);

  function loadClassroom() {
    setClassroomLoading(true);
    fetch("/api/classroom")
      .then((r) => r.json())
      .then((c) => setClassroomId(c?.id ?? ""))
      .catch(() => setClassroomId(""))
      .finally(() => setClassroomLoading(false));
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  const activeIepTypes = Array.from(
    new Set(
      tags
        .filter((t) => selectedTagIds.includes(t.id) && ["IEP", "504"].includes(t.name))
        .map((t) => t.name)
    )
  );

  function setIepField(type: string, field: "accommodations" | "caseManager" | "reviewDate", value: string) {
    setIepFields((prev) => {
      const existing = prev[type] ?? { accommodations: "", caseManager: "", reviewDate: "" };
      return { ...prev, [type]: { ...existing, [field]: value } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!firstName || !lastName || !classroomId) return;
    if (
      activeIepTypes.some((type) => !iepFields[type]?.accommodations?.trim())
    ) {
      setFormError(
        `The ${activeIepTypes.join(" and ")} tag${activeIepTypes.length > 1 ? "s are" : " is"} selected, so accommodations ${activeIepTypes.length > 1 ? "are" : "is"} required in ${activeIepTypes.length > 1 ? "each of those sections" : "that section"} below.`
      );
      return;
    }
    setSaving(true);

    const payload = {
      classroomId,
      sectionId: sectionId || null,
      firstName,
      lastName,
      dob: dob || null,
      tagIds: selectedTagIds,
      allergies: allergen ? [{ allergen, severity, reaction }] : [],
      dietaryRestrictions: dietary ? [{ restriction: dietary }] : [],
      ieps: activeIepTypes.map((type) => ({
        type,
        accommodations: iepFields[type]?.accommodations ?? "",
        caseManager: iepFields[type]?.caseManager ?? "",
        reviewDate: iepFields[type]?.reviewDate ?? "",
      })),
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
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "Couldn't add this student. Please try again.");
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Student</h1>

      {!classroomId && !classroomLoading && (
        <p className="text-rose-600 text-sm mb-4">
          ⚠️ You don't have a classroom set up yet.{" "}
          <Link href="/profile" className="underline font-medium">
            Set up your profile
          </Link>{" "}
          before adding students, or{" "}
          <button onClick={loadClassroom} className="underline font-medium">
            try reloading
          </button>{" "}
          if you know one already exists.
        </p>
      )}
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
            <div>
              <label className="block text-xs text-gray-500">Class</label>
              <select
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                required
              >
                <option value="">Select a class</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {sections.length > 0 ? (
              <div>
                <label className="block text-xs text-gray-500">Period</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="">No Period</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div aria-hidden="true" />
            )}
            <div>
              <label className="block text-xs text-gray-500">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
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

        {activeIepTypes.map((type) => (
          <section key={type} className="card border-2 border-amber-200">
            <h2 className="font-semibold mb-3">
              {type} <span className="text-amber-600 font-normal text-sm">(required - tag selected)</span>
            </h2>
            <textarea
              placeholder="Accommodations"
              value={iepFields[type]?.accommodations ?? ""}
              onChange={(e) => setIepField(type, "accommodations", e.target.value)}
              className="border rounded px-2 py-1 w-full mb-2"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Case manager"
                value={iepFields[type]?.caseManager ?? ""}
                onChange={(e) => setIepField(type, "caseManager", e.target.value)}
                className="border rounded px-2 py-1"
              />
              <input
                type="date"
                value={iepFields[type]?.reviewDate ?? ""}
                onChange={(e) => setIepField(type, "reviewDate", e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </section>
        ))}

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

        {formError && <p className="text-rose-600 text-sm">{formError}</p>}

        <button
          type="submit"
          disabled={saving || !classroomId}
          className="btn-primary px-4 py-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Add Student"}
        </button>
      </form>
    </div>
  );
}
