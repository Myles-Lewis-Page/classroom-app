"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import PieChart from "@/components/PieChart";
import { useSectionContext, filterBySection } from "@/components/SectionContext";

type Tag = { tag: { id: string; name: string; color: string | null } };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string | null;
  sectionId: string | null;
  tags: Tag[];
  allergies: { id: string }[];
};
type AttendanceEntry = { studentId: string; status: string };

export default function RosterPage() {
  const { activeSectionId } = useSectionContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [classroomId, setClassroomId] = useState("");
  const [importing, setImporting] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState<{
    month: { present: number; absent: number };
    ytd: { present: number; absent: number };
  } | null>(null);

  useEffect(() => {
    fetch("/api/attendance/stats").then((r) => r.json()).then(setAttendanceStats);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/classroom").then((r) => r.json()).then((c) => setClassroomId(c?.id ?? ""));
  }, []);

  function downloadTemplate() {
    const csv = [
      "First Name,Last Name,Grade,Section",
      "Jane,Doe,3rd,Group A",
      "John,Smith,3rd,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !classroomId) return;
    setImporting(true);
    const text = await file.text();
    const res = await fetch("/api/students/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classroomId, csvText: text }),
    });
    const result = await res.json();
    setImporting(false);
    if (res.ok) {
      alert(`Imported ${result.imported} student(s).`);
      load();
    } else {
      alert("Import failed. Check that the CSV has First Name / Last Name / Grade columns.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    load();
  }, [date]);

  async function load() {
    setLoading(true);
    const [studentsRes, attendanceRes] = await Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch(`/api/attendance?date=${date}`).then((r) => r.json()),
    ]);
    setStudents(studentsRes);
    const attMap: Record<string, string> = {};
    (attendanceRes as AttendanceEntry[]).forEach((a) => {
      attMap[a.studentId] = a.status;
    });
    setAttendance(attMap);
    setLoading(false);
  }

  async function setStatus(studentId: string, status: string) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, date, status }),
    });
  }

  async function markAllPresent() {
    for (const s of visibleStudents) {
      await setStatus(s.id, "present");
    }
  }

  const visibleStudents = useMemo(
    () => filterBySection(students, activeSectionId),
    [students, activeSectionId]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visibleStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q)
    );
  }, [visibleStudents, search]);

  const presentCount = visibleStudents.filter((s) => (attendance[s.id] ?? "present") === "present").length;
  const absentCount = visibleStudents.filter((s) => attendance[s.id] === "absent").length;
  const total = visibleStudents.length || 1;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Roster & Attendance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Roster */}
        <div>
          <h2 className="font-semibold text-lg mb-2">Roster</h2>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <input
              placeholder="Search name or grade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1 flex-1"
            />
            <Link href="/students/new" className="btn-primary">
              + Add Student
            </Link>
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <a href="/api/reports/export-csv" className="btn-outline">
              Export CSV
            </a>
            <button onClick={downloadTemplate} className="btn-outline">
              Download Template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportFile}
              className="hidden"
              id="csv-import-input"
            />
            <label htmlFor="csv-import-input" className="btn-outline cursor-pointer">
              {importing ? "Importing..." : "Import CSV"}
            </label>
            <a href="/roster/print" target="_blank" className="btn-outline">
              Print View
            </a>
          </div>
          <p className="text-xs text-slate-400 mb-4 -mt-2">
            Import expects columns First Name, Last Name, Grade, and (optional) Section - download
            the template above if you're not sure how to format it.
          </p>

          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th>Grade</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-violet-50/40">
                    <td className="py-2">
                      <Link href={`/students/${s.id}`} className="text-sky-600 hover:underline">
                        {s.lastName}, {s.firstName}
                      </Link>
                      {s.allergies.length > 0 && (
                        <span className="ml-2 text-rose-600" title="Has allergy on file">
                          ⚠️
                        </span>
                      )}
                    </td>
                    <td>
                      {s.grade}
                      {s.section ? ` - ${s.section}` : ""}
                    </td>
                    <td>
                      {s.tags.map((t) => (
                        <span key={t.tag.id} className="tag-chip">
                          {t.tag.name}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT COLUMN: Attendance */}
        <div>
          <h2 className="font-semibold text-lg mb-2">Attendance</h2>

          <div className="panel mb-4">
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2 text-lg w-full mb-3"
            />

            {/* Simple present/absent bar chart for the selected day */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16">Present</span>
                <div className="flex-1 bg-white rounded h-4 overflow-hidden">
                  <div
                    className="h-4 bg-emerald-200"
                    style={{ width: `${(presentCount / total) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right">{presentCount}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16">Absent</span>
                <div className="flex-1 bg-white rounded h-4 overflow-hidden">
                  <div
                    className="h-4 bg-rose-200"
                    style={{ width: `${(absentCount / total) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right">{absentCount}</span>
              </div>
            </div>

            <button onClick={markAllPresent} className="btn-success mt-3 w-full">
              Mark all present
            </button>
          </div>

          {attendanceStats && (
            <div className="panel mb-4">
              <h3 className="font-semibold text-sm mb-3">This Month</h3>
              <PieChart
                size={110}
                slices={[
                  { label: "Present", value: attendanceStats.month.present, color: "#a7f3d0" },
                  { label: "Absent", value: attendanceStats.month.absent, color: "#fecaca" },
                ]}
              />
              <h3 className="font-semibold text-sm mb-3 mt-4">Year to Date</h3>
              <PieChart
                size={110}
                slices={[
                  { label: "Present", value: attendanceStats.ytd.present, color: "#a7f3d0" },
                  { label: "Absent", value: attendanceStats.ytd.absent, color: "#fecaca" },
                ]}
              />
            </div>
          )}

          <ul className="space-y-1">
            {filtered.map((s) => {
              const status = attendance[s.id] ?? "present";
              return (
                <li key={s.id} className="flex items-center justify-between card py-2">
                  <span>
                    {s.lastName}, {s.firstName}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setStatus(s.id, "present")}
                      className={`px-2 py-1 rounded text-xs ${
                        status === "present" ? "bg-emerald-200 text-slate-800" : "bg-violet-100/60"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => setStatus(s.id, "absent")}
                      className={`px-2 py-1 rounded text-xs ${
                        status === "absent" ? "bg-rose-200 text-slate-800" : "bg-violet-100/60"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
