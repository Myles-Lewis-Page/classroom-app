"use client";

import { useEffect, useState } from "react";
import NewsletterView, { NewsletterFonts, type ViewEvent, type ViewShortfall } from "@/components/NewsletterView";

type Block = {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "list"
    | "divider"
    | "image"
    | "events"
    | "chaperones"
    | "spellingWords"
    | "wordWall"
    | "readingNow"
    | "homeLearning";
  content: Record<string, unknown>;
};

export default function NewsletterPrintPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [classroomName, setClassroomName] = useState("Our Classroom");
  const [upcomingEvents, setUpcomingEvents] = useState<ViewEvent[]>([]);
  const [shortfalls, setShortfalls] = useState<ViewShortfall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/newsletter/draft")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.newsletter?.blocks ?? []);
        setClassroomName(data.classroomName ?? "Our Classroom");
        setUpcomingEvents(data.upcomingEvents ?? []);
        setShortfalls(data.shortfalls ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <NewsletterFonts />
      <div className="flex justify-end mb-4 print:hidden">
        <button onClick={() => window.print()} className="btn-primary px-4 py-2">
          Print This Newsletter
        </button>
      </div>
      <NewsletterView
        classroomName={classroomName}
        weekLabel={`Week of ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
        blocks={blocks}
        upcomingEvents={upcomingEvents}
        shortfalls={shortfalls}
      />
    </div>
  );
}
