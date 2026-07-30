"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddRelationship from "@/components/AddRelationship";
import AddNote from "@/components/AddNote";
import EditBasicInfo from "@/components/EditBasicInfo";
import EditTags from "@/components/EditTags";
import EditAllergiesDietary from "@/components/EditAllergiesDietary";
import EditIep from "@/components/EditIep";
import EditSupports from "@/components/EditSupports";
import EditParents from "@/components/EditParents";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import { effectiveGradePercent, daysLate } from "@/lib/grading";
import { formatShortDate } from "@/lib/dateOnly";

type StudentDetail = {
  id: string;
  classroomId: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  section: string | null;
  sectionId: string | null;
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
    submittedAt: string | null;
    gradeStatus: string | null;
    gradeScore: number | null;
    assignment: {
      name: string;
      assignedDate: string;
      dueDate: string | null;
      gradingType: string;
      maxPoints: number | null;
      latePenaltyPercentPerDay: number | null;
      gradeCategory: { id: string; name: string } | null;
      handedOut: boolean;
    };
  }[];
  behaviorEntries: {
    id: string;
    date: string;
    rating: string | null;
    comment: string | null;
    subject: { name: string };
  }[];
  behaviorNotes: {
    id: string;
    date: string;
    type: "good" | "bad";
    tag: string;
    note: string | null;
    subject: { name: string } | null;
    contactLog: { date: string; method: string } | null;
  }[];
  parentContactLogs: {
    id: string;
    date: string;
    reason: string;
    method: string;
    comment: string | null;
  }[];
  supports: {
    supportTypeId: string;
    selectedOptionId: string | null;
    supportType: { name: string };
    selectedOption: { label: string } | null;
  }[];
  skillStatuses: {
    id: string;
    skill: {
      category: string | null;
      skillName: string;
      skillSubject: { id: string; name: string };
    };
  }[];
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [gradeCategories, setGradeCategories] = useState<{ id: string; name: string; weight: number }[]>([]);

  useEffect(() => {
    fetch("/api/grade-categories").then((r) => r.json()).then(setGradeCategories);
  }, []);

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent);
  }

  async function removeStudent() {
    if (!student) return;
    const confirmed = confirm(
      `Remove ${student.firstName} ${student.lastName} from the class? Their records (behavior, attendance, homework, etc.) are kept, but they'll no longer appear in the roster, seating chart, or reports. This can be undone later if needed.`
    );
    if (!confirmed) return;

    setRemoving(true);
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    router.push("/roster");
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
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
                sectionId: student.sectionId,
                classroomId: student.classroomId,
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

      {/* IEP/504 Supports - structured checkboxes with optional dropdowns */}
      <section className="card">
        <h2 className="font-bold mb-2">IEP / 504 Supports</h2>
        {student.supports.length === 0 && !editMode && (
          <p className="text-gray-500 text-sm">None checked</p>
        )}
        {!editMode && (
          <ul className="text-sm space-y-1">
            {student.supports.map((s) => (
              <li key={s.supportTypeId}>
                {s.supportType.name}
                {s.selectedOption ? `: ${s.selectedOption.label}` : ""}
              </li>
            ))}
          </ul>
        )}
        {editMode && (
          <EditSupports studentId={student.id} currentSupports={student.supports} onChanged={refresh} />
        )}
      </section>

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
              <Link
                href={`/skills?subject=${s.skill.skillSubject.id}`}
                className="font-medium text-sky-600 hover:underline"
              >
                {s.skill.skillSubject.name}
              </Link>
              {s.skill.category ? ` — ${s.skill.category}` : ""}: {s.skill.skillName}
            </li>
          ))}
        </ul>
      </section>

      {/* Behavior notes */}
      <section className="card">
        <h2 className="font-bold mb-2">Recent Behavior Notes</h2>
        {student.behaviorNotes.length === 0 && (
          <p className="text-gray-500 text-sm">None logged yet.</p>
        )}
        <ul className="text-sm space-y-1">
          {student.behaviorNotes.map((b) => (
            <li key={b.id}>
              {new Date(b.date).toLocaleDateString()} —{" "}
              <span style={{ color: b.type === "good" ? "green" : "#b91c1c" }}>
                {b.type === "good" ? "Good" : "Bad"}
              </span>
              : {b.tag}
              {b.subject && ` (${b.subject.name})`}
              {b.note && ` — ${b.note}`}
              {b.contactLog ? (
                <span className="text-emerald-700"> · called {new Date(b.contactLog.date).toLocaleDateString()}</span>
              ) : (
                <span className="text-slate-400"> · not called yet</span>
              )}
            </li>
          ))}
        </ul>
        <a href="/behavior" className="text-sky-600 text-sm hover:underline">
          Go to Behavior & Contact Log →
        </a>
      </section>

      {/* Parent Contact Log - shown on profile only, intentionally left out
          of the Weekly Report */}
      <section className="card">
        <h2 className="font-bold mb-2">Parent Contact Log</h2>
        {student.parentContactLogs.length === 0 && (
          <p className="text-gray-500 text-sm">No contacts logged yet.</p>
        )}
        <ul className="text-sm space-y-1">
          {student.parentContactLogs.map((log) => (
            <li key={log.id}>
              {new Date(log.date).toLocaleDateString()} — {log.reason} via {log.method}
              {log.comment && `: ${log.comment}`}
            </li>
          ))}
        </ul>
        <a href="/behavior" className="text-sky-600 text-sm hover:underline">
          Go to Behavior & Contact Log →
        </a>
      </section>

      {/* Attendance */}
      <section className="card">
        <h2 className="font-bold mb-2">Attendance</h2>
        <p className="text-sm">
          Absences (last 30 entries): {student.attendanceEntries.filter((a) => a.status === "absent").length}
        </p>
      </section>

      {/* Assignments (this student's personal gradebook) */}
      <section className="card">
        <h2 className="font-bold mb-2">Assignments</h2>
        {(() => {
          let weightedSum = 0;
          let weightUsed = 0;
          const totalWeight = gradeCategories.reduce((sum, c) => sum + c.weight, 0);
          const byCategory = new Map<string, number[]>();
          const uncategorized: number[] = [];

          student.homeworkEntries.forEach((h) => {
            const pct = effectiveGradePercent(h.assignment, h);
            if (pct === null) return;
            if (h.assignment.gradeCategory) {
              const key = h.assignment.gradeCategory.id;
              if (!byCategory.has(key)) byCategory.set(key, []);
              byCategory.get(key)!.push(pct);
            } else {
              uncategorized.push(pct);
            }
          });

          gradeCategories.forEach((cat) => {
            const percents = byCategory.get(cat.id);
            if (!percents || percents.length === 0) return;
            const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
            weightedSum += avg * cat.weight;
            weightUsed += cat.weight;
          });
          if (uncategorized.length > 0) {
            const avg = uncategorized.reduce((a, b) => a + b, 0) / uncategorized.length;
            const w = Math.max(0, 100 - totalWeight);
            if (w > 0) {
              weightedSum += avg * w;
              weightUsed += w;
            }
          }
          const overall = weightUsed > 0 ? Math.round(weightedSum / weightUsed) : null;

          // Submission timing: Missing / Late / On Time, for the pie chart.
          let missing = 0;
          let late = 0;
          let onTime = 0;
          student.homeworkEntries.forEach((h) => {
            if (h.status === "missing") {
              missing++;
            } else if (h.status === "handed_in") {
              if (h.assignment.dueDate && h.submittedAt && new Date(h.submittedAt) > new Date(h.assignment.dueDate)) {
                late++;
              } else {
                onTime++;
              }
            }
          });

          // Grade trend, oldest to newest (homeworkEntries arrive newest-first).
          const gradePoints = [...student.homeworkEntries]
            .reverse()
            .map((h) => {
              const pct = effectiveGradePercent(h.assignment, h);
              return pct === null ? null : { label: h.assignment.name, value: pct };
            })
            .filter((p): p is { label: string; value: number } => p !== null);

          const categoryBreakdown = gradeCategories
            .map((cat) => {
              const percents = byCategory.get(cat.id);
              if (!percents || percents.length === 0) return null;
              const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
              return { name: cat.name, avg };
            })
            .filter((c): c is { name: string; avg: number } => c !== null);
          if (uncategorized.length > 0) {
            categoryBreakdown.push({
              name: "Uncategorized",
              avg: Math.round(uncategorized.reduce((a, b) => a + b, 0) / uncategorized.length),
            });
          }

          return (
            <>
              <div className="flex flex-wrap gap-3 mb-3">
                {categoryBreakdown.map((c) => (
                  <span key={c.name} className="text-xs bg-sky-50 border border-sky-100 rounded px-2 py-1">
                    {c.name}: <span className="font-semibold">{c.avg}%</span>
                  </span>
                ))}
                <span className="text-xs bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
                  Overall: <span className="font-semibold">{overall !== null ? `${overall}%` : "—"}</span>
                </span>
              </div>
              <p className="text-sm font-medium mb-3">
                Overall grade: {overall !== null ? `${overall}%` : "Not enough graded work yet"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Missing / Late / On Time</p>
                  <PieChart
                    size={90}
                    slices={[
                      { label: "On Time", value: onTime, color: "#a7f3d0" },
                      { label: "Late", value: late, color: "#fde68a" },
                      { label: "Missing", value: missing, color: "#fecaca" },
                    ]}
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Grade Trend</p>
                  <LineChart
                    points={gradePoints}
                    width={200}
                    height={90}
                    min={0}
                    max={100}
                    formatValue={(v) => `${v}%`}
                  />
                </div>
              </div>
            </>
          );
        })()}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b text-slate-500">
              <th className="py-1">Assignment</th>
              <th>Assigned</th>
              <th>Due</th>
              <th>Status</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {student.homeworkEntries.map((h) => {
              const lateDays = daysLate(h.assignment, h);
              const late = h.status === "handed_in" && lateDays > 0;
              const pct = effectiveGradePercent(h.assignment, h);
              const penaltyApplied = late && !!h.assignment.latePenaltyPercentPerDay;
              const grade =
                h.gradeScore !== null
                  ? `${h.gradeScore}/${h.assignment.maxPoints}${penaltyApplied ? ` (${pct}%)` : ""}`
                  : h.gradeStatus === "complete"
                  ? `Complete (${penaltyApplied ? pct : 100}%)`
                  : h.gradeStatus === "incomplete"
                  ? "Incomplete (0%)"
                  : "Not graded";
              return (
                <tr key={h.id} className="border-b align-top">
                  <td className="py-1">
                    {h.assignment.gradeCategory && `${h.assignment.gradeCategory.name}: `}
                    {h.assignment.name}
                  </td>
                  <td className="whitespace-nowrap">{formatShortDate(h.assignment.assignedDate)}</td>
                  <td className="whitespace-nowrap">
                    {h.assignment.dueDate ? formatShortDate(h.assignment.dueDate) : "—"}
                  </td>
                  <td>
                    {h.status === "missing" ? (
                      <span className="text-rose-600 font-medium">Missing</span>
                    ) : late ? (
                      <span className="text-amber-600 font-medium">Late</span>
                    ) : (
                      "Handed in"
                    )}
                  </td>
                  <td>{grade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {editMode && (
        <div className="pt-4 border-t">
          <button
            onClick={removeStudent}
            disabled={removing}
            className="w-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium rounded px-4 py-3 text-base disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove Student From Class"}
          </button>
        </div>
      )}
    </div>
  );
}
