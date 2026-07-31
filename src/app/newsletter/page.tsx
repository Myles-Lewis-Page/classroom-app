"use client";

import { useEffect, useState, useCallback } from "react";
import NewsletterView, { NewsletterFonts, COLOR_CLASSES, type ViewEvent, type ViewShortfall } from "@/components/NewsletterView";
import type { BlockColor } from "@/lib/newsletter";

type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "divider"
  | "image"
  | "events"
  | "spellingWords"
  | "wordWall"
  | "readingNow"
  | "homeLearning";

type Block = {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  column: number;
  span: number;
};

type Newsletter = {
  id: string;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  blocks: Block[];
};

type Template = {
  id: string;
  name: string;
  blocks: { id: string; type: BlockType; content: Record<string, unknown>; order: number; column: number; span: number }[];
};

type ArchiveIssue = {
  id: string;
  weekOf: string | null;
  publishedAt: string | null;
  renderedText: string | null;
};

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "Bulleted List",
  divider: "Divider",
  image: "Image",
  events: "Important Dates (auto, incl. chaperone QR codes)",
  spellingWords: "Spelling Words",
  wordWall: "Word Wall",
  readingNow: "Current Reading + Questions",
  homeLearning: "Learning at Home",
};

export default function NewsletterPage() {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [preview, setPreview] = useState("");
  const [classroomName, setClassroomName] = useState("Our Classroom");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<ViewEvent[]>([]);
  const [shortfalls, setShortfalls] = useState<ViewShortfall[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showPlainText, setShowPlainText] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState<ArchiveIssue[]>([]);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [newBlockColumn, setNewBlockColumn] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch("/api/newsletter/draft");
    const data = await res.json();
    setNewsletter(data.newsletter);
    setBannerTitle(data.newsletter?.bannerTitle ?? "");
    setBannerSubtitle(data.newsletter?.bannerSubtitle ?? "");
    setPreview(data.preview ?? "");
    setClassroomName(data.classroomName ?? "Our Classroom");
    setUpcomingEvents(data.upcomingEvents ?? []);
    setShortfalls(data.shortfalls ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBanner(nextTitle: string, nextSubtitle: string) {
    setSavingBanner(true);
    await fetch("/api/newsletter/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerTitle: nextTitle, bannerSubtitle: nextSubtitle }),
    });
    setSavingBanner(false);
  }

  async function saveBlockLayout(blockId: string, column: number, span: number) {
    if (!newsletter) return;
    setNewsletter({
      ...newsletter,
      blocks: newsletter.blocks.map((b) => (b.id === blockId ? { ...b, column, span } : b)),
    });
    await fetch(`/api/newsletter/draft/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column, span }),
    });
    load();
  }

  async function addBlock(type: BlockType) {
    await fetch("/api/newsletter/draft/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, column: newBlockColumn }),
    });
    load();
  }

  async function saveBlockContent(blockId: string, content: Record<string, unknown>) {
    setSavingBlockId(blockId);
    await fetch(`/api/newsletter/draft/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSavingBlockId(null);
    load();
  }

  async function deleteBlock(blockId: string) {
    await fetch(`/api/newsletter/draft/blocks/${blockId}`, { method: "DELETE" });
    load();
  }

  function updateLocalBlock(blockId: string, content: Record<string, unknown>) {
    if (!newsletter) return;
    setNewsletter({
      ...newsletter,
      blocks: newsletter.blocks.map((b) => (b.id === blockId ? { ...b, content } : b)),
    });
  }

  async function handleDrop(targetId: string) {
    if (!newsletter || !dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const blocks = [...newsletter.blocks];
    const fromIdx = blocks.findIndex((b) => b.id === dragId);
    const toIdx = blocks.findIndex((b) => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null);
      return;
    }
    const [moved] = blocks.splice(fromIdx, 1);
    blocks.splice(toIdx, 0, moved);
    setNewsletter({ ...newsletter, blocks });
    setDragId(null);

    await fetch("/api/newsletter/draft/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: blocks.map((b) => b.id) }),
    });
    load();
  }

  async function loadTemplates() {
    const res = await fetch("/api/newsletter/templates");
    setTemplates(await res.json());
  }

  async function saveAsTemplate() {
    const name = newTemplateName.trim();
    if (!name) return;
    const res = await fetch("/api/newsletter/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewTemplateName("");
      loadTemplates();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Couldn't save template.");
    }
  }

  async function applyTemplate(templateId: string) {
    if (!confirm("This replaces everything currently in your draft with this template. Continue?")) {
      return;
    }
    await fetch(`/api/newsletter/templates/${templateId}/apply`, { method: "POST" });
    load();
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template? This can't be undone.")) return;
    await fetch(`/api/newsletter/templates/${templateId}`, { method: "DELETE" });
    loadTemplates();
  }

  async function loadArchive() {
    const res = await fetch("/api/newsletter/archive");
    setArchive(await res.json());
  }

  async function publish() {
    if (!confirm("Publish this week's newsletter? It'll be saved to your archive and a fresh draft will start for next week.")) {
      return;
    }
    setPublishing(true);
    const res = await fetch("/api/newsletter/publish", { method: "POST" });
    setPublishing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Couldn't publish.");
      return;
    }
    load();
  }

  if (loading || !newsletter) {
    return <div className="p-6 text-slate-400">Loading...</div>;
  }

  const viewBlocks = newsletter.blocks.map((b) => ({ id: b.id, type: b.type, content: b.content, column: b.column, span: b.span }));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <NewsletterFonts />
      <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
        <div>
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Design it however you like below - colors, headings, photos, a running list of dates.
            A plain-text version (no colors/images, since parent emails go out as a plain-text
            link) gets pulled into the top of every{" "}
            <a href="/reports" className="underline">
              Weekly Report
            </a>{" "}
            email automatically. For the full colorful version, use{" "}
            <a href="/newsletter/print" className="underline" target="_blank" rel="noreferrer">
              Print / Send Home
            </a>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href="/newsletter/print" target="_blank" rel="noreferrer" className="btn-outline px-4 py-2">
            Print / Send Home
          </a>
          <button onClick={publish} disabled={publishing} className="btn-primary px-4 py-2">
            {publishing ? "Publishing..." : "Publish This Week"}
          </button>
        </div>
      </div>

      <div className="border rounded p-3 mb-4 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Top Banner {savingBanner && <span className="normal-case font-normal">(saving...)</span>}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            onBlur={() => saveBanner(bannerTitle, bannerSubtitle)}
            placeholder={`${classroomName}'s Newsletter (default)`}
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            value={bannerSubtitle}
            onChange={(e) => setBannerSubtitle(e.target.value)}
            onBlur={() => saveBanner(bannerTitle, bannerSubtitle)}
            placeholder="Week of ... (default)"
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 text-sm mb-4">
        <button
          onClick={() => {
            setShowTemplates((v) => !v);
            if (!showTemplates) loadTemplates();
          }}
          className="text-sky-600 hover:underline"
        >
          {showTemplates ? "Hide" : "Templates"}
        </button>
        <button
          onClick={() => {
            setShowArchive((v) => !v);
            if (!showArchive) loadArchive();
          }}
          className="text-sky-600 hover:underline"
        >
          {showArchive ? "Hide" : "Past Issues"}
        </button>
      </div>

      {showTemplates && (
        <div className="border rounded p-4 mb-4 bg-slate-50">
          <h2 className="font-semibold text-sm mb-2">Templates</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Save current draft as..."
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <button onClick={saveAsTemplate} className="btn-outline text-sm px-3">
              Save
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-slate-400">No saved templates yet.</p>
          ) : (
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm border-b py-1">
                  <span>
                    {t.name} <span className="text-slate-400">({t.blocks.length} blocks)</span>
                  </span>
                  <span className="flex gap-3">
                    <button onClick={() => applyTemplate(t.id)} className="text-sky-600 hover:underline text-xs">
                      Use
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-rose-600 hover:underline text-xs">
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showArchive && (
        <div className="border rounded p-4 mb-4 bg-slate-50">
          <h2 className="font-semibold text-sm mb-2">Past Issues</h2>
          {archive.length === 0 ? (
            <p className="text-xs text-slate-400">Nothing published yet.</p>
          ) : (
            <ul className="space-y-2">
              {archive.map((issue) => (
                <li key={issue.id} className="border-b pb-2">
                  <button
                    onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                    className="text-sm text-sky-600 hover:underline"
                  >
                    Week of {issue.weekOf ? new Date(issue.weekOf).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                  </button>
                  {expandedIssueId === issue.id && (
                    <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-2 mt-1">
                      {issue.renderedText}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <label className="text-xs text-slate-500 flex items-center gap-1">
              Add to column
              <select
                value={newBlockColumn}
                onChange={(e) => setNewBlockColumn(Number(e.target.value))}
                className="border rounded px-1 py-0.5 text-xs"
              >
                {[1, 2, 3, 4].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
              <button key={type} onClick={() => addBlock(type)} className="btn-outline text-xs px-2 py-1">
                {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {newsletter.blocks.length === 0 && (
              <p className="text-sm text-slate-400 border rounded p-4 text-center">
                No blocks yet - add one above to get started.
              </p>
            )}
            {newsletter.blocks.map((block) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDragId(block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(block.id)}
                className={`border rounded p-3 bg-white cursor-move ${dragId === block.id ? "opacity-40" : ""}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    ⠿ {BLOCK_LABELS[block.type]}
                  </span>
                  <span className="flex items-center gap-2">
                    {savingBlockId === block.id && <span className="text-xs text-slate-400">Saving...</span>}
                    <button onClick={() => deleteBlock(block.id)} className="text-rose-600 text-xs hover:underline">
                      Remove
                    </button>
                  </span>
                </div>
                <BlockEditor
                  block={block}
                  onChange={(content) => updateLocalBlock(block.id, content)}
                  onSave={(content) => saveBlockContent(block.id, content)}
                />
                <LayoutPicker
                  column={block.column}
                  span={block.span}
                  onChange={(column, span) => saveBlockLayout(block.id, column, span)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-sm mb-2">Preview</h2>
          <NewsletterView
            classroomName={classroomName}
            weekLabel={`Week of ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
            bannerTitle={bannerTitle}
            bannerSubtitle={bannerSubtitle}
            blocks={viewBlocks}
            upcomingEvents={upcomingEvents}
            shortfalls={shortfalls}
          />
          <button
            onClick={() => setShowPlainText((v) => !v)}
            className="text-xs text-slate-500 hover:underline mt-3"
          >
            {showPlainText ? "Hide" : "Show"} what actually goes in the emailed report (plain text)
          </button>
          {showPlainText && (
            <pre className="text-xs whitespace-pre-wrap border rounded p-3 bg-slate-50 mt-2">
              {preview || "Nothing to preview yet."}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: BlockColor | undefined;
  onChange: (color: BlockColor) => void;
}) {
  const colors: BlockColor[] = ["coral", "teal", "sunny", "grape", "sky"];
  return (
    <div className="flex gap-1.5 mt-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c].bg} ${
            value === c ? "ring-2 ring-offset-1 ring-slate-500" : ""
          }`}
        />
      ))}
    </div>
  );
}

function LayoutPicker({
  column,
  span,
  onChange,
}: {
  column: number;
  span: number;
  onChange: (column: number, span: number) => void;
}) {
  const maxSpanForColumn = 5 - column;
  return (
    <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-slate-500">
      <label className="flex items-center gap-1">
        Column
        <select
          value={column}
          onChange={(e) => {
            const nextColumn = Number(e.target.value);
            const nextSpan = Math.min(span, 5 - nextColumn);
            onChange(nextColumn, nextSpan);
          }}
          className="border rounded px-1 py-0.5"
        >
          {[1, 2, 3, 4].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        Width
        <select
          value={span}
          onChange={(e) => onChange(column, Number(e.target.value))}
          className="border rounded px-1 py-0.5"
        >
          {[1, 2, 3, 4].filter((s) => s <= maxSpanForColumn).map((s) => (
            <option key={s} value={s}>
              {s} col{s > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      {/* Tiny visual indicator of where this sits on the 4-column grid */}
      <span className="flex gap-0.5 ml-auto">
        {[1, 2, 3, 4].map((c) => (
          <span
            key={c}
            className={`w-3 h-3 rounded-sm ${
              c >= column && c < column + span ? "bg-sky-400" : "bg-slate-200"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

function ImageBlockEditor({
  url,
  caption,
  onChange,
  onSave,
}: {
  url: string;
  caption: string;
  onChange: (content: Record<string, unknown>) => void;
  onSave: (content: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/newsletter/upload-image", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed - try a different photo.");
      return;
    }
    const data = await res.json();
    onSave({ url: data.url, caption });
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
        }}
        className={`border-2 border-dashed rounded p-4 text-center text-sm ${
          dragOver ? "border-sky-500 bg-sky-50" : "border-slate-300"
        }`}
      >
        {uploading ? (
          <p className="text-slate-400">Uploading...</p>
        ) : url ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={caption || "Newsletter image"} className="max-h-32 rounded border mx-auto mb-2" />
            <label className="text-sky-600 hover:underline cursor-pointer text-xs">
              Replace photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                }}
              />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <p className="text-slate-500">Drag a photo here, or click to choose one</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <input
        value={caption}
        onChange={(e) => onChange({ url, caption: e.target.value })}
        onBlur={() => onSave({ url, caption })}
        className="border rounded px-2 py-1 w-full text-sm"
        placeholder="Caption (optional)"
      />
      <p className="text-xs text-amber-600">
        Shows as a photo here and when printed - but as a link in the actual parent email.
      </p>
    </div>
  );
}
function BlockEditor({
  block,
  onChange,
  onSave,
}: {
  block: Block;
  onChange: (content: Record<string, unknown>) => void;
  onSave: (content: Record<string, unknown>) => void;
}) {
  const content = block.content;
  const color = content.color as BlockColor | undefined;

  if (block.type === "heading") {
    const text = (content.text as string) ?? "";
    return (
      <div>
        <input
          value={text}
          onChange={(e) => onChange({ text: e.target.value, color })}
          onBlur={() => onSave({ text, color })}
          className="border rounded px-2 py-1 w-full font-semibold"
          placeholder="Heading text"
        />
        <ColorPicker value={color} onChange={(c) => onSave({ text, color: c })} />
      </div>
    );
  }

  if (block.type === "paragraph") {
    const text = (content.text as string) ?? "";
    return (
      <div>
        <textarea
          value={text}
          onChange={(e) => onChange({ text: e.target.value, color })}
          onBlur={() => onSave({ text, color })}
          rows={3}
          className="border rounded px-2 py-1 w-full text-sm"
          placeholder="Write something..."
        />
        <ColorPicker value={color} onChange={(c) => onSave({ text, color: c })} />
      </div>
    );
  }

  if (block.type === "list") {
    const items = (content.items as string[]) ?? [""];
    return (
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-1">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange({ items: next, color });
              }}
              onBlur={() => onSave({ items, color })}
              className="border rounded px-2 py-1 w-full text-sm"
              placeholder="List item"
            />
            <button
              onClick={() => {
                const next = items.filter((_, i) => i !== idx);
                onChange({ items: next, color });
                onSave({ items: next, color });
              }}
              className="text-rose-600 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ items: [...items, ""], color })}
          className="text-sky-600 text-xs hover:underline"
        >
          + Add item
        </button>
        <ColorPicker value={color} onChange={(c) => onSave({ items, color: c })} />
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div>
        <p className="text-xs text-slate-400 text-center py-1">— divider —</p>
        <ColorPicker value={color} onChange={(c) => onSave({ color: c })} />
      </div>
    );
  }

  if (block.type === "image") {
    const url = (content.url as string) ?? "";
    const caption = (content.caption as string) ?? "";
    return (
      <ImageBlockEditor
        url={url}
        caption={caption}
        onChange={(c) => onChange(c)}
        onSave={(c) => onSave(c)}
      />
    );
  }

  if (block.type === "events") {
    return (
      <div>
        <p className="text-xs text-slate-500">
          Automatically lists your next 10 upcoming events. Any event that&apos;s still short on
          chaperones automatically gets a QR code right under its date - nothing to fill in here.
        </p>
        <ColorPicker value={color} onChange={(c) => onSave({ color: c })} />
      </div>
    );
  }

  if (block.type === "spellingWords" || block.type === "wordWall") {
    const words = (content.words as string[]) ?? [""];
    return (
      <div className="space-y-1">
        {words.map((word, idx) => (
          <div key={idx} className="flex gap-1">
            <input
              value={word}
              onChange={(e) => {
                const next = [...words];
                next[idx] = e.target.value;
                onChange({ words: next, color });
              }}
              onBlur={() => onSave({ words, color })}
              className="border rounded px-2 py-1 w-full text-sm"
              placeholder="Word"
            />
            <button
              onClick={() => {
                const next = words.filter((_, i) => i !== idx);
                onChange({ words: next, color });
                onSave({ words: next, color });
              }}
              className="text-rose-600 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ words: [...words, ""], color })}
          className="text-sky-600 text-xs hover:underline"
        >
          + Add word
        </button>
        <ColorPicker value={color} onChange={(c) => onSave({ words, color: c })} />
      </div>
    );
  }

  if (block.type === "readingNow") {
    const title = (content.title as string) ?? "";
    const author = (content.author as string) ?? "";
    const questions = (content.questions as string[]) ?? [""];
    return (
      <div className="space-y-1">
        <input
          value={title}
          onChange={(e) => onChange({ title: e.target.value, author, questions, color })}
          onBlur={() => onSave({ title, author, questions, color })}
          className="border rounded px-2 py-1 w-full text-sm font-semibold"
          placeholder="Book title"
        />
        <input
          value={author}
          onChange={(e) => onChange({ title, author: e.target.value, questions, color })}
          onBlur={() => onSave({ title, author, questions, color })}
          className="border rounded px-2 py-1 w-full text-sm"
          placeholder="Author (optional)"
        />
        <p className="text-xs text-slate-500 mt-2">Questions to ask at home:</p>
        {questions.map((q, idx) => (
          <div key={idx} className="flex gap-1">
            <input
              value={q}
              onChange={(e) => {
                const next = [...questions];
                next[idx] = e.target.value;
                onChange({ title, author, questions: next, color });
              }}
              onBlur={() => onSave({ title, author, questions, color })}
              className="border rounded px-2 py-1 w-full text-sm"
              placeholder="Question"
            />
            <button
              onClick={() => {
                const next = questions.filter((_, i) => i !== idx);
                onChange({ title, author, questions: next, color });
                onSave({ title, author, questions: next, color });
              }}
              className="text-rose-600 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ title, author, questions: [...questions, ""], color })}
          className="text-sky-600 text-xs hover:underline"
        >
          + Add question
        </button>
        <ColorPicker value={color} onChange={(c) => onSave({ title, author, questions, color: c })} />
      </div>
    );
  }

  if (block.type === "homeLearning") {
    const items = (content.items as string[]) ?? [""];
    return (
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-1">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange({ items: next, color });
              }}
              onBlur={() => onSave({ items, color })}
              className="border rounded px-2 py-1 w-full text-sm"
              placeholder="A tip or activity for home"
            />
            <button
              onClick={() => {
                const next = items.filter((_, i) => i !== idx);
                onChange({ items: next, color });
                onSave({ items: next, color });
              }}
              className="text-rose-600 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ items: [...items, ""], color })}
          className="text-sky-600 text-xs hover:underline"
        >
          + Add item
        </button>
        <ColorPicker value={color} onChange={(c) => onSave({ items, color: c })} />
      </div>
    );
  }

  return null;
}
