"use client";

import { useEffect, useState } from "react";

type Student = { id: string; firstName: string; lastName: string };
type LiteracySkill = { id: string; category: string; skillName: string; order: number };
type Status = { studentId: string; literacySkillId: string; status: string };

const STATUS_CYCLE = ["not_started", "practicing", "mastered"] as const;
const STATUS_COLOR: Record<string, string> = {
  not_started: "#e0e7ff",
  practicing: "#fde68a",
  mastered: "#a7f3d0",
};

export default function LiteracyPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<LiteracySkill[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<"reading" | "writing">("reading");
  const [newSkillName, setNewSkillName] = useState("");
  const [classroomId, setClassroomId] = useState("");

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    load();
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? "")).catch(() => {});
  }, []);

  function load() {
    fetch("/api/literacy").then((r) => r.json()).then(({ skills, statuses }) => {
      setSkills(skills);
      const map: Record<string, string> = {};
      (statuses as Status[]).forEach((s) => {
        map[`${s.studentId}::${s.literacySkillId}`] = s.status;
      });
      setStatuses(map);
    });
  }

  async function cycle(studentId: string, skillId: string) {
    const key = `${studentId}::${skillId}`;
    const current = statuses[key] ?? "not_started";
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]) + 1) % 3];
    setStatuses((prev) => ({ ...prev, [key]: next }));
    await fetch("/api/literacy/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, literacySkillId: skillId, status: next }),
    });
  }

  async function addSkill() {
    if (!newSkillName.trim() || !classroomId) return;
    await fetch("/api/literacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        category,
        skillName: newSkillName.trim(),
        order: skills.filter((s) => s.category === category).length,
      }),
    });
    setNewSkillName("");
    load();
  }

  async function removeSkill(skillId: string, skillName: string) {
    if (!confirm(`Remove "${skillName}"? This will delete all students' progress on this skill.`)) {
      return;
    }
    await fetch(`/api/literacy?skillId=${skillId}`, { method: "DELETE" });
    load();
  }

  const readingSkills = skills.filter((s) => s.category === "reading");
  const writingSkills = skills.filter((s) => s.category === "writing");
  const visibleSkills = category === "reading" ? readingSkills : writingSkills;

  return (
    <div className="p-6 max-w-6xl mx-auto overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Reading & Writing</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCategory("reading")}
          className={`px-3 py-1 rounded text-sm ${category === "reading" ? "bg-sky-200 text-slate-800" : "bg-violet-100/60"}`}
        >
          Reading
        </button>
        <button
          onClick={() => setCategory("writing")}
          className={`px-3 py-1 rounded text-sm ${category === "writing" ? "bg-sky-200 text-slate-800" : "bg-violet-100/60"}`}
        >
          Writing
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          placeholder={`Add a ${category} skill (e.g. ${category === "reading" ? "Guided Reading Level C" : "Complete sentences"})`}
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          className="border rounded px-2 py-1 flex-1"
        />
        <button onClick={addSkill} className="btn-primary">
          Add Skill
        </button>
      </div>

      {visibleSkills.length === 0 ? (
        <p className="text-gray-500">
          No {category} skills yet — add your own above (sight words, guided reading levels,
          fluency, sentence structure, punctuation, etc.). This list is fully custom.
        </p>
      ) : (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-violet-50/40 sticky left-0">Student</th>
              {visibleSkills.map((skill) => (
                <th key={skill.id} className="border p-2 bg-violet-50/40 whitespace-nowrap">
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
                {visibleSkills.map((skill) => {
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
    </div>
  );
}
