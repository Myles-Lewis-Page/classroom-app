"use client";

import { useEffect, useState } from "react";

type Student = { id: string; firstName: string; lastName: string };
type SkillSubject = { id: string; name: string };
type Skill = { id: string; category: string | null; skillName: string; order: number };
type Status = { studentId: string; skillId: string; status: string };

const STATUS_CYCLE = ["not_started", "practicing", "mastered"] as const;
const STATUS_COLOR: Record<string, string> = {
  not_started: "#e0e7ff",
  practicing: "#fde68a",
  mastered: "#a7f3d0",
};

export default function SkillsPage() {
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
        if (subs.length > 0) setSelectedSubjectId((prev) => prev || subs[0].id);
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
    const current = statuses[key] ?? "not_started";
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]) + 1) % 3];
    setStatuses((prev) => ({ ...prev, [key]: next }));
    await fetch("/api/skills/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, skillId, status: next }),
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

  return (
    <div className="p-6 max-w-6xl mx-auto overflow-x-auto">
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
              placeholder="Category (optional, e.g. multiplication)"
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
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-white sticky left-0">Student</th>
                  {skills.map((skill) => (
                    <th key={skill.id} className="border p-2 bg-white whitespace-nowrap">
                      {skill.category && (
                        <>
                          {skill.category}
                          <br />
                        </>
                      )}
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
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="border p-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                      {student.lastName}, {student.firstName}
                    </td>
                    {skills.map((skill) => {
                      const status = statuses[`${student.id}::${skill.id}`] ?? "not_started";
                      return (
                        <td key={skill.id} className="border p-1 text-center">
                          <button
                            onClick={() => cycle(student.id, skill.id)}
                            className="w-6 h-6 rounded-full inline-block"
                            style={{ backgroundColor: STATUS_COLOR[status] }}
                            title={status}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
