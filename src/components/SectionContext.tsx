"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SectionOption = { id: string; name: string; order: number };

type SectionContextValue = {
  sections: SectionOption[];
  refreshSections: () => void;
};

const SectionContext = createContext<SectionContextValue>({
  sections: [],
  refreshSections: () => {},
});

export function SectionProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<SectionOption[]>([]);

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
  }, [load]);

  return (
    <SectionContext.Provider value={{ sections, refreshSections: load }}>
      {children}
    </SectionContext.Provider>
  );
}

export function useSectionContext() {
  return useContext(SectionContext);
}

/** Filters any list of Period-taggable items down to one Period (or returns them all if periodId is null). */
export function filterBySection<T extends { sectionId?: string | null }>(
  items: T[],
  periodId: string | null
): T[] {
  if (!periodId) return items;
  return items.filter((item) => item.sectionId === periodId);
}
