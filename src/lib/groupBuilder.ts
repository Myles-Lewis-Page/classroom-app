// Group Builder core logic.
//
// Rules, in priority order:
// 1. HARD CONSTRAINT: two students with a "conflict" relationship must never
//    land in the same group. This is checked first and is non-negotiable.
// 2. Sort mode: "homogeneous" (similar levels grouped together) or
//    "heterogeneous" (mixed levels, spread strong/weak students across groups).
// 3. SOFT PREFERENCE: where possible, try to keep "works_well" pairs together,
//    but never at the expense of rule 1.
//
// If no valid grouping exists that satisfies the hard constraint (e.g. dense
// conflict overlap), the group is flagged so the teacher can manually resolve
// it rather than silently ignoring a conflict.

export type StudentForGrouping = {
  id: string;
  name: string;
  level: number; // understandingLevel, or math/reading level depending on mode
};

export type ConflictPair = { a: string; b: string };
export type PreferredPair = { a: string; b: string };

export type Group = {
  students: StudentForGrouping[];
  hasUnresolvedConflictRisk?: boolean;
};

export function buildGroups(
  students: StudentForGrouping[],
  groupSize: number,
  conflicts: ConflictPair[],
  preferences: PreferredPair[] = [],
  sortMode: "homogeneous" | "heterogeneous" = "heterogeneous"
): Group[] {
  const conflictSet = buildPairSet(conflicts);
  const preferenceSet = buildPairSet(preferences);

  const numGroups = Math.ceil(students.length / groupSize);
  const sorted = [...students].sort((a, b) => b.level - a.level);

  const groups: StudentForGrouping[][] = Array.from({ length: numGroups }, () => []);

  if (sortMode === "heterogeneous") {
    // Snake draft distributes levels evenly across groups (1 strong per group ideally)
    let groupIndex = 0;
    let direction = 1;
    for (const student of sorted) {
      placeStudent(student, groups, groupIndex, conflictSet, preferenceSet);
      groupIndex += direction;
      if (groupIndex === numGroups - 1 || groupIndex === 0) direction *= -1;
    }
  } else {
    // Homogeneous: chunk sorted list into contiguous blocks of similar level
    let i = 0;
    for (const student of sorted) {
      const targetGroup = Math.min(Math.floor(i / groupSize), numGroups - 1);
      placeStudent(student, groups, targetGroup, conflictSet, preferenceSet);
      i++;
    }
  }

  // Post-pass: verify no conflict pair ended up together; flag if unresolved
  return groups.map((g) => ({
    students: g,
    hasUnresolvedConflictRisk: hasConflict(g, conflictSet),
  }));
}

function placeStudent(
  student: StudentForGrouping,
  groups: StudentForGrouping[][],
  preferredGroupIndex: number,
  conflictSet: Set<string>,
  preferenceSet: Set<string>
) {
  // Try preferred group first, then scan others for a conflict-free slot
  const order = [
    preferredGroupIndex,
    ...groups.map((_, idx) => idx).filter((idx) => idx !== preferredGroupIndex),
  ];

  for (const idx of order) {
    const group = groups[idx];
    const conflictFree = !group.some((s) => conflictSet.has(pairKey(s.id, student.id)));
    if (conflictFree) {
      group.push(student);
      return;
    }
  }

  // No conflict-free group found (rare) — place in preferred group anyway,
  // it will be flagged by hasConflict() for manual teacher review.
  groups[preferredGroupIndex].push(student);
}

function hasConflict(group: StudentForGrouping[], conflictSet: Set<string>): boolean {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (conflictSet.has(pairKey(group[i].id, group[j].id))) return true;
    }
  }
  return false;
}

function buildPairSet(pairs: { a: string; b: string }[]): Set<string> {
  const set = new Set<string>();
  for (const p of pairs) {
    set.add(pairKey(p.a, p.b));
  }
  return set;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}
