"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SectionOption = { id: string; name: string; order: number };

type SectionContextValue = {
  sections: SectionOption[];
  activeSectionId: string | null; // null = "All Students"
  setActiveSectionId: (id: string | null) => void;
  refreshSections: () => void;
};

const SectionContext = createContext<SectionContextValue>({
  sections: [],
  activeSectionId: null,
  setActiveSectionId: () => {},
  refreshSections: () => {},
});

const STORAGE_KEY = "activeSectionId";

export function SectionProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [activeSectionId, setActiveSectionIdState] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data: SectionOption[]) => {
        setSections(Array.isArray(data) ? data : []);
      })
      .catch(() => setSections([]));
  }, []);

  useEffect(() => {
    load();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setActiveSectionIdState(stored);
  }, [load]);

  // If the active section gets deleted elsewhere, fall back to "All Students".
  useEffect(() => {
    if (activeSectionId && sections.length > 0 && !sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionIdState(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [sections, activeSectionId]);

  function setActiveSectionId(id: string | null) {
    setActiveSectionIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <SectionContext.Provider
      value={{ sections, activeSectionId, setActiveSectionId, refreshSections: load }}
    >
      {children}
    </SectionContext.Provider>
  );
}

export function useSectionContext() {
  return useContext(SectionContext);
}

/** Filters any list of section-taggable items down to the active section (or returns them all). */
export function filterBySection<T extends { sectionId?: string | null }>(
  items: T[],
  activeSectionId: string | null
): T[] {
  if (!activeSectionId) return items;
  return items.filter((item) => item.sectionId === activeSectionId);
}
