/**
 * A block's occupied rectangle on the 4-column grid. column/row are the
 * top-left cell (1-indexed); span/height are how many columns/rows wide.
 */
export type GridRect = { column: number; row: number; span: number; height: number };

/** Inclusive [start, end] cell ranges a rect occupies, for overlap math. */
function bounds(rect: GridRect) {
  return {
    colStart: rect.column,
    colEnd: rect.column + rect.span - 1,
    rowStart: rect.row,
    rowEnd: rect.row + rect.height - 1,
  };
}

/** Do two rectangles occupy any of the same cell? */
export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  const A = bounds(a);
  const B = bounds(b);
  return A.colStart <= B.colEnd && B.colStart <= A.colEnd && A.rowStart <= B.rowEnd && B.rowStart <= A.rowEnd;
}

/**
 * Returns the id of the first existing block that would overlap the
 * candidate placement, or null if it's clear. `others` should already
 * exclude the block being moved (a block never "collides" with itself).
 */
export function findCollision(
  candidate: GridRect,
  others: (GridRect & { id: string })[]
): string | null {
  for (const other of others) {
    if (rectsOverlap(candidate, other)) return other.id;
  }
  return null;
}

/**
 * The next open row for a freshly-added block: one past whatever the
 * lowest existing block currently reaches, so new blocks stack below
 * everything else by default rather than needing manual placement every
 * time. Column is left to the caller (the "Add to column" picker).
 */
export function nextAvailableRow(blocks: { row: number; height: number }[]): number {
  if (blocks.length === 0) return 1;
  return Math.max(...blocks.map((b) => b.row + b.height - 1)) + 1;
}
