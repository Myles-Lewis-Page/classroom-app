"use client";

import { useEffect, useState } from "react";

type Student = { id: string; firstName: string; lastName: string };
type MathSkill = { id: string; category: string; skillName: string; order: number };
type Status = { studentId: string; mathSkillId: string; status: string };

const STATUS_CYCLE = ["not_started", "practicing", "mastered"] as const;
const STATUS_COLOR: Record<string, string> = {
  not_started: "#e0e7ff",
  practicing: "#fde68a",
  mastered: "#a7f3d0",
};

export default function MathSkillsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<MathSkill[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({}); // key: studentId::skillId
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [classroomId, setClassroomId] = useState("");
  const [newCategory, setNewCategory] = useState("multiplication");
  const [newSkillName, setNewSkillName] = useState("");

  useEffect(() => {
    fetch("/api/students").then((r) => r.json()).then(setStudents);
    load();
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? "")).catch(() => {});
  }, []);

  function load() {
    fetch("/api/math").then((r) => r.json()).then(({ skills, statuses }) => {
      setSkills(skills);
      const map: Record<string, string> = {};
      (statuses as Status[]).forEach((s) => {
        map[`${s.studentId}::${s.mathSkillId}`] = s.status;
      });
      setStatuses(map);
    });
  }

  async function addSkill() {
    if (!newSkillName.trim() || !classroomId) return;
    await fetch("/api/math/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        category: newCategory,
        skillName: newSkillName.trim(),
        order: skills.filter((s) => s.category === newCategory).length,
      }),
    });
    setNewSkillName("");
    load();
  }

  async function removeSkill(skillId: string, skillName: string) {
    if (!confirm(`Remove "${skillName}"? This will delete all students' progress on this skill.`)) {
      return;
    }
    await fetch(`/api/math/skills?skillId=${skillId}`, { method: "DELETE" });
    if (filterSkill === skillId) setFilterSkill("");
    load();
  }

  async function cycle(studentId: string, skillId: string) {
    const key = `${studentId}::${skillId}`;
    const current = statuses[key] ?? "not_started";
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]) + 1) % 3];
    setStatuses((prev) => ({ ...prev, [key]: next }));
    await fetch("/api/math", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, mathSkillId: skillId, status: next }),
    });
  }

  const categories = Array.from(new Set(skills.map((s) => s.category)));
  const visibleSkills = filterSkill ? skills.filter((s) => s.id === filterSkill) : skills;

  return (
    <div className="p-6 max-w-6xl mx-auto overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Math Skills</h1>

      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <select
          value={filterSkill}
          onChange={(e) => setFilterSkill(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Show all skills</option>
          {categories.map((cat) => (
            <optgroup key={cat} label={cat}>
              {skills
                .filter((s) => s.category === cat)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skillName}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="border rounded p-3 mb-4 flex gap-2 flex-wrap items-center">
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="multiplication">Multiplication</option>
          <option value="addition">Addition</option>
          <option value="subtraction">Subtraction</option>
          <option value="division">Division</option>
        </select>
        <input
          placeholder="New skill name (e.g. 13s, triple + triple)"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <button onClick={addSkill} className="btn-primary">
          Add Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-gray-500">
          No math skills set up yet. Add multiplication tables, addition/subtraction types, and
          division facts to begin tracking.
        </p>
      ) : (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-violet-50/40 sticky left-0">Student</th>
              {visibleSkills.map((skill) => (
                <th key={skill.id} className="border p-2 bg-violet-50/40 whitespace-nowrap">
                  {skill.category}
                  <br />
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
