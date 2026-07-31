"use client";

import { useEffect, useState } from "react";

export default function NewsletterPage() {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/newsletter")
      .then((r) => r.json())
      .then((data) => setContent(data.newsletterContent ?? ""));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/newsletter", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsletterContent: content }),
    });
    setSaving(false);
    setSavedAt(new Date());
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Newsletter</h1>
      <p className="text-sm text-slate-500 mb-4">
        Build this up throughout the week - it goes at the very top of every parent's email when
        you generate the{" "}
        <a href="/reports" className="underline">
          Weekly Report
        </a>
        , before their own student's individual information. It isn't cleared automatically after
        sending, so clear it yourself here whenever you want to start fresh for the next week.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        placeholder="What's happening this week, upcoming dates, reminders..."
        className="border rounded px-3 py-2 w-full text-sm"
      />
      <div className="flex items-center gap-3 mt-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save"}
        </button>
        {savedAt && <span className="text-xs text-slate-400">Saved {savedAt.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
