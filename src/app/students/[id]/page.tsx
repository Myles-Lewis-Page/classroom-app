"use client";

import { useEffect, useState, use } from "react";
import AddRelationship from "@/components/AddRelationship";
import AddNote from "@/components/AddNote";
import EditBasicInfo from "@/components/EditBasicInfo";
import EditTags from "@/components/EditTags";
import EditAllergiesDietary from "@/components/EditAllergiesDietary";
import EditIep from "@/components/EditIep";
import EditParents from "@/components/EditParents";

type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string | null;
  dob: string | null;
  understandingLevel: number | null;
  tags: { tag: { id: string; name: string } }[];
  allergies: { id: string; allergen: string; severity: string; reaction: string | null }[];
  dietaryRestrictions: { id: string; restriction: string; notes: string | null }[];
  ieps: {
    id: string;
    type: string;
    accommodations: string;
    serviceMinutes: string | null;
    goals: string | null;
    caseManager: string | null;
    reviewDate: string | null;
  }[];
  parents: {
    id: string;
    name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    preferredContact: string | null;
    isEmergencyContact: boolean;
    notes: string | null;
  }[];
  relationshipsFrom: { type: string; relatedStudent: { id: string; firstName: string; lastName: string } }[];
  relationshipsTo: { type: string; student: { id: string; firstName: string; lastName: string } }[];
  observations: { id: string; date: string; note: string }[];
  praiseNotes: { id: string; date: string; note: string }[];
  attendanceEntries: { id: string; date: string; status: string }[];
  homeworkEntries: {
    id: string;
    status: string;
    assignment: { name: string; date: string };
  }[];
  behaviorEntries: {
    id: string;
    date: string;
    rating: string | null;
    comment: string | null;
    subject: { name: string };
  }[];
  skillStatuses: {
    id: string;
    skill: { category: string | null; skillName: string; skillSubject: { name: string } };
  }[];
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent);
  }

  if (!student) return <div className="p-6">Loading...</div>;

  const worksWellWith = [
    ...student.relationshipsFrom.filter((r) => r.type === "works_well").map((r) => r.relatedStudent),
    ...student.relationshipsTo.filter((r) => r.type === "works_well").map((r) => r.student),
  ];
  const conflictsWith = [
    ...student.relationshipsFrom.filter((r) => r.type === "conflict").map((r) => r.relatedStudent),
    ...student.relationshipsTo.filter((r) => r.type === "conflict").map((r) => r.student),
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-600">
              Grade {student.grade}
              {student.section ? ` - ${student.section}` : ""}
              {student.dob ? ` · DOB ${new Date(student.dob).toLocaleDateString()}` : ""}
            </p>
          </div>
          <button
            onClick={() => setEditMode((e) => !e)}
            className="border rounded px-3 py-1 text-sm"
          >
            {editMode ? "Done Editing" : "Edit"}
          </button>
        </div>
        <div className="mt-1">
          {student.tags.map((t) => (
            <span key={t.tag.id} className="tag-chip">
              {t.tag.name}
            </span>
          ))}
        </div>
        {editMode && (
          <div className="mt-3 space-y-3">
            <EditBasicInfo
              studentId={student.id}
              initial={{
                firstName: student.firstName,
                lastName: student.lastName,
                grade: student.grade,
                section: student.section,
                dob: student.dob,
                understandingLevel: student.understandingLevel,
              }}
              onSaved={refresh}
            />
            <EditTags
              studentId={student.id}
              currentTagIds={student.tags.map((t) => t.tag.id)}
              onChanged={refresh}
            />
          </div>
        )}
      </div>

      {/* Dietary / Allergies - prominent safety banner */}
      {(student.allergies.length > 0 || student.dietaryRestrictions.length > 0 || editMode) && (
        <section className="safety-banner">
          <h2 className="font-bold text-rose-700 mb-2">⚠️ Dietary & Allergies</h2>
          {student.allergies.map((a) => (
            <p key={a.id} className="text-rose-700">
              <strong>{a.allergen}</strong> ({a.severity}){a.reaction ? ` — ${a.reaction}` : ""}
            </p>
          ))}
          {student.dietaryRestrictions.map((d) => (
            <p key={d.id} className="text-rose-700">
              {d.restriction} {d.notes ? `— ${d.notes}` : ""}
            </p>
          ))}
          {editMode && (
            <div className="mt-3">
              <EditAllergiesDietary
                studentId={student.id}
                allergies={student.allergies}
                dietaryRestrictions={student.dietaryRestrictions}
                onChanged={refresh}
              />
            </div>
          )}
        </section>
      )}

      {/* IEP / Special Requirements */}
      {(student.ieps.length > 0 || editMode) && (
        <section className="card">
          <h2 className="font-bold mb-2">IEP / Special Requirements</h2>
          {student.ieps.map((iep) => (
            <div key={iep.id} className="mb-2">
              <p className="font-medium">{iep.type}</p>
              <p className="text-sm text-gray-700">{iep.accommodations}</p>
              {iep.serviceMinutes && <p className="text-sm">Service minutes: {iep.serviceMinutes}</p>}
              {iep.caseManager && <p className="text-sm">Case manager: {iep.caseManager}</p>}
              {iep.reviewDate && (
                <p className="text-sm">Review date: {new Date(iep.reviewDate).toLocaleDateString()}</p>
              )}
            </div>
          ))}
          {editMode && (
            <div className="mt-3">
              <EditIep studentId={student.id} ieps={student.ieps} onChanged={refresh} />
            </div>
          )}
        </section>
      )}

      {/* Parent / Guardian */}
      <section className="card">
        <h2 className="font-bold mb-2">Parent / Guardian Info</h2>
        {student.parents.length === 0 && <p className="text-gray-500 text-sm">None on file</p>}
        {student.parents.map((p) => (
          <div key={p.id} className="mb-2 text-sm">
            <p className="font-medium">
              {p.name} ({p.relationship}) {p.isEmergencyContact && "🚨 Emergency contact"}
            </p>
            <p>
              {p.phone ?? "—"} · {p.email ?? "—"} (prefers {p.preferredContact ?? "—"})
            </p>
            {p.notes && <p className="text-gray-600">{p.notes}</p>}
          </div>
        ))}
        {editMode && (
          <div className="mt-3">
            <EditParents studentId={student.id} parents={student.parents} onChanged={refresh} />
          </div>
        )}
      </section>

      {/* Social Dynamics */}
      <section className="card">
        <h2 className="font-bold mb-2">Social Dynamics</h2>
        <p className="text-sm">
          <strong>Works well with:</strong>{" "}
          {worksWellWith.length ? worksWellWith.map((s) => `${s.firstName} ${s.lastName}`).join(", ") : "—"}
        </p>
        <p className="text-sm mb-3">
          <strong>Does not work well with:</strong>{" "}
          {conflictsWith.length ? conflictsWith.map((s) => `${s.firstName} ${s.lastName}`).join(", ") : "—"}
        </p>
        <AddRelationship studentId={student.id} onAdded={refresh} />
      </section>

      {/* Skills - mastered only, grouped by subject */}
      <section className="card">
        <h2 className="font-bold mb-2">Skills — Mastered</h2>
        {student.skillStatuses.length === 0 && <p className="text-gray-500 text-sm">None yet</p>}
        <ul className="list-disc list-inside text-sm">
          {student.skillStatuses.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.skill.skillSubject.name}</span>
              {s.skill.category ? ` — ${s.skill.category}` : ""}: {s.skill.skillName}
            </li>
          ))}
        </ul>
      </section>

      {/* Behavior history */}
      <section className="card">
        <h2 className="font-bold mb-2">Recent Behavior Log</h2>
        <ul className="text-sm space-y-1">
          {student.behaviorEntries.map((b) => (
            <li key={b.id}>
              {new Date(b.date).toLocaleDateString()} — {b.subject.name}:{" "}
              <span
                style={{
                  color: b.rating === "green" ? "green" : b.rating === "yellow" ? "#b58900" : "red",
                }}
              >
                {b.rating ?? "unrated"}
              </span>
              {b.comment && ` — ${b.comment}`}
            </li>
          ))}
        </ul>
      </section>

      {/* Attendance */}
      <section className="card">
        <h2 className="font-bold mb-2">Attendance</h2>
        <p className="text-sm">
          Absences (last 30 entries): {student.attendanceEntries.filter((a) => a.status === "absent").length}
        </p>
      </section>

      {/* Homework */}
      <section className="card">
        <h2 className="font-bold mb-2">Homework</h2>
        <ul className="text-sm space-y-1">
          {student.homeworkEntries.map((h) => (
            <li key={h.id}>
              {new Date(h.assignment.date).toLocaleDateString()} — {h.assignment.name}: {h.status}
            </li>
          ))}
        </ul>
      </section>

      {/* Quick notes & Praise */}
      <section className="card">
        <h2 className="font-bold mb-2">Quick Notes</h2>
        <ul className="text-sm space-y-1">
          {student.observations.map((o) => (
            <li key={o.id}>
              {new Date(o.date).toLocaleDateString()} — {o.note}
            </li>
          ))}
        </ul>
        <AddNote studentId={student.id} type="observation" onAdded={refresh} />
      </section>

      <section className="card">
        <h2 className="font-bold mb-2">🌟 Praise Notes</h2>
        <ul className="text-sm space-y-1">
          {student.praiseNotes.map((p) => (
            <li key={p.id}>
              {new Date(p.date).toLocaleDateString()} — {p.note}
            </li>
          ))}
        </ul>
        <AddNote studentId={student.id} type="praise" onAdded={refresh} />
      </section>
    </div>
  );
}
