"use client";

import { useEffect, useState, use } from "react";
import { formatShortDate } from "@/lib/dateOnly";

type RosterWord = { wordId: string; word: string; correct: boolean | null };
type RosterEntry = { studentId: string; studentName: string; words: RosterWord[] };
type TestDay = { id: string; date: string; type: "first" | "makeup" };

export default function TestDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [testDay, setTestDay] = useState<TestDay | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [marks, setMarks] = useState<Record<string, boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/spelling/test-days/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTestDay(data.testDay);
        setRoster(data.roster);
        const initial: Record<string, boolean | null> = {};
        for (const entry of data.roster as RosterEntry[]) {
          for (const w of entry.words) {
            initial[`${entry.studentId}:${w.wordId}`] = w.correct;
          }
        }
        setMarks(initial);
        setLoading(false);
      });
  }, [id]);

  function toggle(studentId: string, wordId: string, correct: boolean) {
    setSaved(false);
    setMarks((prev) => ({ ...prev, [`${studentId}:${wordId}`]: correct }));
  }

  async function save() {
    setSaving(true);
    const results = Object.entries(marks)
      .filter(([, v]) => v !== null)
      .map(([key, correct]) => {
        const [studentId, wordId] = key.split(":");
        return { studentId, wordId, correct };
      });
    await fetch(`/api/spelling/test-days/${id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading || !testDay) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {testDay.type === "first" ? "First Test" : "Makeup Test"} — {formatShortDate(testDay.date)}
          </h1>
          <p className="text-sm text-slate-500">
            {testDay.type === "makeup"
              ? "Only students who missed a word on the first test are shown, each with just their own missed words."
              : "Mark every student on every word."}
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary px-4 py-2">
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Results"}
        </button>
      </div>

      {roster.length === 0 && (
        <p className="text-sm text-slate-400 border rounded p-4 text-center">
          {testDay.type === "makeup"
            ? "Nobody needs a makeup test for this list - everyone got every word right."
            : "No active students found."}
        </p>
      )}

      <div className="space-y-4">
        {roster.map((entry) => (
          <div key={entry.studentId} className="border rounded p-3 bg-white">
            <p className="font-medium text-sm mb-2">{entry.studentName}</p>
            <div className="flex flex-wrap gap-2">
              {entry.words.map((w) => {
                const key = `${entry.studentId}:${w.wordId}`;
                const value = marks[key];
                return (
                  <div key={w.wordId} className="flex items-center gap-1 border rounded px-2 py-1">
                    <span className="text-sm">{w.word}</span>
                    <button
                      onClick={() => toggle(entry.studentId, w.wordId, true)}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        value === true ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => toggle(entry.studentId, w.wordId, false)}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        value === false ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
