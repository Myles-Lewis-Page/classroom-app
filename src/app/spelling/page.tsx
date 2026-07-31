"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatShortDate, toDateInputValue } from "@/lib/dateOnly";

type SpellingWord = { id: string; word: string; order: number };
type SpellingTestDay = { id: string; date: string; type: "first" | "makeup" };
type SpellingListT = {
  id: string;
  weekOf: string;
  words: SpellingWord[];
  testDays: SpellingTestDay[];
};

export default function SpellingPage() {
  const router = useRouter();
  const [lists, setLists] = useState<SpellingListT[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newWeekOf, setNewWeekOf] = useState(toDateInputValue(nextMonday()));
  const [newWordsText, setNewWordsText] = useState("");
  const [creating, setCreating] = useState(false);

  const [newTestDayDate, setNewTestDayDate] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/spelling/lists")
      .then((r) => r.json())
      .then((data) => {
        setLists(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function nextMonday(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function createList() {
    const words = newWordsText
      .split("\n")
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length === 0) return;
    setCreating(true);
    const res = await fetch("/api/spelling/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekOf: newWeekOf, words }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Couldn't create list.");
      return;
    }
    setNewWordsText("");
    setNewWeekOf(toDateInputValue(nextMonday()));
    load();
  }

  async function deleteList(id: string) {
    if (!confirm("Delete this spelling list and all its test results? This can't be undone.")) return;
    await fetch(`/api/spelling/lists/${id}`, { method: "DELETE" });
    load();
  }

  async function addTestDay(listId: string, type: "first" | "makeup") {
    const date = newTestDayDate[listId];
    if (!date) {
      alert("Pick a date first.");
      return;
    }
    const res = await fetch(`/api/spelling/lists/${listId}/test-days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Couldn't add test day.");
      return;
    }
    load();
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Spelling</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Upload a week&apos;s word list, mark results on test day, and set up a shortened
            makeup test for anyone who missed a word. See the{" "}
            <a href="/spelling/wordbank" className="underline">
              Word Bank
            </a>{" "}
            for which words the class knows well vs. which are worth reusing.
          </p>
        </div>
      </div>

      <div className="border rounded p-4 mb-6 bg-slate-50">
        <h2 className="font-semibold text-sm mb-2">Upload This Week&apos;s Words</h2>
        <div className="flex gap-2 items-end flex-wrap mb-2">
          <label className="text-xs text-slate-500">
            Week of
            <input
              type="date"
              value={newWeekOf}
              onChange={(e) => setNewWeekOf(e.target.value)}
              className="border rounded px-2 py-1 text-sm block mt-1"
            />
          </label>
        </div>
        <textarea
          value={newWordsText}
          onChange={(e) => setNewWordsText(e.target.value)}
          placeholder={"One word per line, e.g.\nfriend\nbecause\nschool"}
          rows={6}
          className="border rounded px-2 py-1 w-full text-sm font-mono"
        />
        <button onClick={createList} disabled={creating} className="btn-primary px-4 py-2 mt-2">
          {creating ? "Saving..." : "Save This Week's List"}
        </button>
      </div>

      <div className="space-y-3">
        {lists.length === 0 && (
          <p className="text-sm text-slate-400 border rounded p-4 text-center">
            No spelling lists yet - upload this week&apos;s words above to get started.
          </p>
        )}
        {lists.map((list) => {
          const firstDay = list.testDays.find((t) => t.type === "first");
          const makeupDays = list.testDays.filter((t) => t.type === "makeup");
          const expanded = expandedId === list.id;
          return (
            <div key={list.id} className="border rounded bg-white">
              <div className="flex justify-between items-center p-3">
                <button
                  onClick={() => setExpandedId(expanded ? null : list.id)}
                  className="text-left font-medium text-sm hover:underline"
                >
                  Week of {formatShortDate(list.weekOf)} — {list.words.length} words
                </button>
                <div className="flex items-center gap-3 text-xs">
                  <a href={`/api/spelling/export/first?listId=${list.id}`} className="text-sky-600 hover:underline">
                    Print Master List
                  </a>
                  {firstDay && (
                    <a href={`/api/spelling/export/makeup?listId=${list.id}`} className="text-sky-600 hover:underline">
                      Print Makeup Tests
                    </a>
                  )}
                  <button onClick={() => deleteList(list.id)} className="text-rose-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Words</p>
                    <p className="text-sm">{list.words.map((w) => w.word).join(", ")}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Test Days</p>
                    {list.testDays.length === 0 && <p className="text-xs text-slate-400 mb-2">None scheduled yet.</p>}
                    <ul className="space-y-1 mb-2">
                      {list.testDays.map((td) => (
                        <li key={td.id} className="flex items-center gap-2 text-sm">
                          <button
                            onClick={() => router.push(`/spelling/test-day/${td.id}`)}
                            className="text-sky-600 hover:underline"
                          >
                            {formatShortDate(td.date)} — {td.type === "first" ? "First Test" : "Makeup Test"}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={newTestDayDate[list.id] ?? ""}
                        onChange={(e) => setNewTestDayDate({ ...newTestDayDate, [list.id]: e.target.value })}
                        className="border rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => addTestDay(list.id, "first")}
                        disabled={!!firstDay}
                        className="btn-outline text-xs px-2 py-1 disabled:opacity-40"
                        title={firstDay ? "This list already has a first test day" : ""}
                      >
                        + Add First Test Day
                      </button>
                      <button
                        onClick={() => addTestDay(list.id, "makeup")}
                        disabled={!firstDay}
                        className="btn-outline text-xs px-2 py-1 disabled:opacity-40"
                        title={!firstDay ? "Mark a first test day before scheduling a makeup" : ""}
                      >
                        + Add Makeup Day
                      </button>
                      {makeupDays.length > 0 && (
                        <span className="text-xs text-slate-400">({makeupDays.length} makeup day(s) already scheduled)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
