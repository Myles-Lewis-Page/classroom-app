"use client";

import { useEffect, useState } from "react";

type WordStat = { word: string; correct: number; total: number; percentCorrect: number | null };
type SectionOption = { id: string; name: string };

export default function WordBankPage() {
  const [words, setWords] = useState<WordStat[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then(setSections)
      .catch(() => setSections([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = sectionId ? `/api/spelling/wordbank?sectionId=${sectionId}` : "/api/spelling/wordbank";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setWords(data);
        setLoading(false);
      });
  }, [sectionId]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Spelling Word Bank</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Every word the class has ever been tested on, worst-known first - a quick way to find
            words worth using again in a future week.
          </p>
        </div>
        <a href="/spelling" className="text-sky-600 text-sm hover:underline">
          ← Back to Spelling
        </a>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <label className="text-slate-500">View:</label>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Overall (whole class)</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (Period)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : words.length === 0 ? (
        <p className="text-sm text-slate-400 border rounded p-4 text-center">
          No spelling results recorded yet.
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="py-2">Word</th>
              <th className="py-2">Times Tested</th>
              <th className="py-2">% Correct</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.word} className="border-b">
                <td className="py-1.5 font-medium">{w.word}</td>
                <td className="py-1.5">{w.total}</td>
                <td className="py-1.5">
                  <span
                    className={
                      w.percentCorrect === null
                        ? "text-slate-400"
                        : w.percentCorrect < 50
                        ? "text-rose-600 font-semibold"
                        : w.percentCorrect < 80
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }
                  >
                    {w.percentCorrect === null ? "—" : `${w.percentCorrect}%`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
