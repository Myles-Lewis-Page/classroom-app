"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PieChart from "@/components/PieChart";
import { ratingScaleColor, parseRating } from "@/lib/skillRating";

type Student = { id: string; firstName: string; lastName: string };
type SkillSubject = { id: string; name: string };
type Skill = { id: string; category: string | null; skillName: string; order: number };
type Status = { studentId: string; skillId: string; status: string };

function SkillsPageInner() {
  const searchParams = useSearchParams();
  const subjectFromUrl = searchParams.get("subject");

  const [subjects, setSubjects] = useState<SkillSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [newSkillCategory, setNewSkillCategory] = useState("");
  const [newSkillName, setNewSkillName] = useState("");

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) loadSkills(selectedSubjectId);
  }, [selectedSubjectId]);

  function loadSubjects() {
    fetch("/api/skill-subjects")
      .then((r) => r.json())
      .then((subs: SkillSubject[]) => {
        setSubjects(subs);
        setSelectedSubjectId((prev) => {
          if (prev) return prev;
          if (subjectFromUrl && subs.some((s) => s.id === subjectFromUrl)) return subjectFromUrl;
          return subs[0]?.id ?? "";
        });
      });
  }

  function loadSkills(subjectId: string) {
    fetch(`/api/skills?subjectId=${subjectId}`)
      .then((r) => r.json())
      .then(({ skills, statuses }: { skills: Skill[]; statuses: Status[] }) => {
        setSkills(skills);
        const map: Record<string, string> = {};
        statuses.forEach((s) => {
          map[`${s.studentId}::${s.skillId}`] = s.status;
        });
        setStatuses(map);
      });
  }

  async function cycle(studentId: string, skillId: string) {
    const key = `${studentId}::${skillId}`;
    const current = parseRating(statuses[key]);
    const next = (current + 1) % 6; // 0,1,2,3,4,5,0...
    setStatuses((prev) => ({ ...prev, [key]: String(next) }));
    await fetch("/api/skills/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, skillId, status: String(next) }),
    });
  }

  async function addSkill() {
    if (!newSkillName.trim() || !selectedSubjectId) return;
    await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selectedSubjectId,
        category: newSkillCategory.trim() || null,
        skillName: newSkillName.trim(),
        order: skills.length,
      }),
    });
    setNewSkillName("");
    loadSkills(selectedSubjectId);
  }

  async function removeSkill(skillId: string, skillName: string) {
    if (!confirm(`Remove "${skillName}"? This will delete all students' progress on this skill.`)) {
      return;
    }
    await fetch(`/api/skills?skillId=${skillId}`, { method: "DELETE" });
    loadSkills(selectedSubjectId);
  }

  // Group skills by category so each category (the "group" set when adding
  // a skill) gets its own titled table.
  const groups = new Map<string, Skill[]>();
  skills.forEach((skill) => {
    const key = skill.category?.trim() || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(skill);
  });

  // Class-wide bucket counts (Mastered / Progressing / Not started) across a
  // given set of skills, for the pie charts.
  function bucketCounts(skillSet: Skill[]) {
    let mastered = 0;
    let progressing = 0;
    let notStarted = 0;
    students.forEach((student) => {
      skillSet.forEach((skill) => {
        const rating = parseRating(statuses[`${student.id}::${skill.id}`]);
        if (rating === 5) mastered++;
        else if (rating === 0) notStarted++;
        else progressing++;
      });
    });
    return { mastered, progressing, notStarted };
  }

  const overallBuckets = bucketCounts(skills);
  const totalPairs = students.length * skills.length;
  const percentMastered =
    totalPairs > 0 ? Math.round((overallBuckets.mastered / totalPairs) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Skills</h1>

      {subjects.length === 0 ? (
        <p className="text-slate-500">
          No subjects set up yet. Go to your{" "}
          <a href="/profile" className="underline text-sky-600">
            Profile
          </a>{" "}
          to pick which subjects you teach.
        </p>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedSubjectId === s.id ? "btn-primary" : "bg-white border"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="panel mb-4 flex gap-2 flex-wrap items-center">
            <input
              placeholder="Group name (e.g. multiplication) - skills with the same group share a table"
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              placeholder="New skill name (e.g. 7s, Guided Reading Level C)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <button onClick={addSkill} className="btn-primary">
              Add Skill
            </button>
          </div>

          {skills.length === 0 ? (
            <p className="text-slate-500">No skills yet for this subject - add one above.</p>
          ) : (
            <>
              {/* Overall subject summary */}
              <div className="panel mb-6">
                <h2 className="font-bold text-lg mb-1">
                  Overall — {subjects.find((s) => s.id === selectedSubjectId)?.name}
                </h2>
                <p className="text-sm text-slate-600 mb-3">
                  {percentMastered}% of all skill checks are fully mastered across the class
                </p>
                <PieChart
                  slices={[
                    { label: "Mastered (5/5)", value: overallBuckets.mastered, color: "#a7f3d0" },
                    { label: "Progressing (1-4)", value: overallBuckets.progressing, color: "#fde68a" },
                    { label: "Not started", value: overallBuckets.notStarted, color: "#ede9fe" },
                  ]}
                />
              </div>

              {Array.from(groups.entries()).map(([groupName, groupSkills]) => {
                const groupBuckets = bucketCounts(groupSkills);
                return (
                  <div key={groupName} className="mb-10">
                    <h2 className="font-bold text-lg mb-2 capitalize">{groupName}</h2>

                    <div className="panel mb-3 inline-block">
                      <PieChart
                        size={100}
                        slices={[
                          { label: "Mastered", value: groupBuckets.mastered, color: "#a7f3d0" },
                          { label: "Progressing", value: groupBuckets.progressing, color: "#fde68a" },
                          { label: "Not started", value: groupBuckets.notStarted, color: "#ede9fe" },
                        ]}
                      />
                    </div>

                    <table className="border-collapse text-sm block overflow-x-auto">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-white sticky left-0">Student</th>
                          {groupSkills.map((skill) => (
                            <th key={skill.id} className="border p-2 bg-white whitespace-nowrap">
                              {skill.skillName}
                              <br />
                              <button
                                onClick={() => removeSkill(skill.id, skill.skillName)}
                                className="text-rose-600 text-xs mt-1 hover:underline"
                                title="Remove this skill"
                              >
                                Remove
                              </button>
                            </th>
                          ))}
                          <th className="border p-2 bg-white whitespace-nowrap">Avg (out of 5)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const ratings = groupSkills.map((skill) =>
                            parseRating(statuses[`${student.id}::${skill.id}`])
                          );
                          const avg =
                            ratings.length > 0
                              ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
                              : 0;
                          return (
                            <tr key={student.id}>
                              <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                                {student.lastName}, {student.firstName}
                              </td>
                              {groupSkills.map((skill) => {
                                const rating = parseRating(statuses[`${student.id}::${skill.id}`]);
                                return (
                                  <td key={skill.id} className="border p-1 text-center">
                                    <button
                                      onClick={() => cycle(student.id, skill.id)}
                                      className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-semibold text-slate-700"
                                      style={{ backgroundColor: ratingScaleColor(rating) }}
                                      title={`${rating}/5`}
                                    >
                                      {rating}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="border p-2">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span
                                      key={i}
                                      className="w-4 h-4 rounded-sm inline-block"
                                      style={{
                                        backgroundColor: i < avg ? "#a7f3d0" : "#ede9fe",
                                      }}
                                    />
                                  ))}
                                  <span className="text-xs text-slate-500 ml-1 whitespace-nowrap">
                                    {avg}/5
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SkillsPageInner />
    </Suspense>
  );
}
