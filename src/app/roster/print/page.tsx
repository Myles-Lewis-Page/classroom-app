"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string | null;
  tags: { tag: { name: string } }[];
  allergies: { allergen: string; severity: string }[];
};

export default function PrintRosterPage() {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then(setStudents);
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto print:p-0">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-xl font-bold">Class Roster — Print View</h1>
        <button onClick={() => window.print()} className="btn-primary px-4 py-2">
          Print
        </button>
      </div>

      <h1 className="hidden print:block text-xl font-bold mb-4">
        Class Roster — {new Date().toLocaleDateString()}
      </h1>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">Name</th>
            <th className="text-left py-1">Grade</th>
            <th className="text-left py-1">Tags</th>
            <th className="text-left py-1">Allergies</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-1">
                {s.lastName}, {s.firstName}
              </td>
              <td className="py-1">
                {s.grade}
                {s.section ? ` - ${s.section}` : ""}
              </td>
              <td className="py-1">{s.tags.map((t) => t.tag.name).join(", ")}</td>
              <td className="py-1 text-rose-700">
                {s.allergies.map((a) => `${a.allergen} (${a.severity})`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
