"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudentRef = { id: string; firstName: string; lastName: string };
type RotationData = {
  weeklyGoal: number;
  weeklyCount: number;
  contactedThisWeek: StudentRef[];
  contactedThisMonth: StudentRef[];
  needsContact: StudentRef[];
};

export default function ParentContactRotationWidget({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<RotationData | null>(null);

  useEffect(() => {
    fetch("/api/parent-contact-log/rotation")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  const pct = Math.min(100, Math.round((data.weeklyCount / data.weeklyGoal) * 100));
  const met = data.weeklyCount >= data.weeklyGoal;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">
          {met ? "✅" : "📞"} Weekly Positive-Call Goal: {data.weeklyCount}/{data.weeklyGoal}
        </h3>
        {!compact && (
          <Link href="/parent-log" className="text-sky-600 text-sm hover:underline">
            Go to Parent Log →
          </Link>
        )}
      </div>
      <div className="bg-violet-50 rounded h-3 overflow-hidden mb-3">
        <div
          className={`h-3 ${met ? "bg-emerald-300" : "bg-amber-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!compact && (
        <>
          <p className="text-sm font-medium mb-1">
            Contacted this week ({data.contactedThisWeek.length}):
          </p>
          <p className="text-sm text-slate-600 mb-3">
            {data.contactedThisWeek.length > 0
              ? data.contactedThisWeek.map((s) => `${s.firstName} ${s.lastName}`).join(", ")
              : "No one yet this week"}
          </p>

          <p className="text-sm font-medium mb-1">
            Still need to contact this month ({data.needsContact.length}), next up first:
          </p>
          <p className="text-sm text-slate-600">
            {data.needsContact.length > 0
              ? data.needsContact
                  .slice(0, 10)
                  .map((s) => `${s.firstName} ${s.lastName}`)
                  .join(", ") + (data.needsContact.length > 10 ? "..." : "")
              : "Everyone's been reached this month! 🎉"}
          </p>
        </>
      )}
    </div>
  );
}
