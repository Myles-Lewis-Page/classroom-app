import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

type Cell = { row: number; col: number };

// POST body variants:
//
// Rows layout:
// { mode: "rows", rows, cols, rowWalkways: number[], colWalkways: number[] }
//   rowWalkways/colWalkways are row/col indices (in the FINAL rendered grid)
//   left empty as an aisle - e.g. colWalkways: [3] leaves a gap after the
//   3rd column of desks.
//
// Groups layout:
// { mode: "groups", groupCount, seatsPerGroup, groupsPerRow }
//   Arranges pods of desks (2x2-ish blocks sized to fit seatsPerGroup) in a
//   grid of pods, with a walkway gap between every pod automatically.
//
// Either mode REPLACES the existing layout entirely (seats with no student
// currently placed are simply dropped; seats with a student get a warning
// returned so the teacher can decide before confirming - handled client-side
// by asking the teacher to confirm first).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  let cells: Cell[] = [];

  if (body.mode === "rows") {
    const rows = Math.max(1, Math.min(30, Number(body.rows) || 5));
    const cols = Math.max(1, Math.min(30, Number(body.cols) || 6));
    const rowWalkways = new Set<number>(Array.isArray(body.rowWalkways) ? body.rowWalkways : []);
    const colWalkways = new Set<number>(Array.isArray(body.colWalkways) ? body.colWalkways : []);

    for (let r = 0; r < rows; r++) {
      if (rowWalkways.has(r)) continue;
      for (let c = 0; c < cols; c++) {
        if (colWalkways.has(c)) continue;
        cells.push({ row: r, col: c });
      }
    }
  } else if (body.mode === "groups") {
    const groupCount = Math.max(1, Math.min(20, Number(body.groupCount) || 4));
    const seatsPerGroup = Math.max(1, Math.min(8, Number(body.seatsPerGroup) || 4));
    const groupsPerRow = Math.max(1, Math.min(10, Number(body.groupsPerRow) || 2));

    // Each pod is laid out roughly 2 seats wide, ceil(seatsPerGroup/2) tall.
    const podCols = seatsPerGroup <= 2 ? seatsPerGroup : 2;
    const podRows = Math.ceil(seatsPerGroup / podCols);
    const podGapCols = podCols + 1; // 1-col walkway after each pod
    const podGapRows = podRows + 1; // 1-row walkway after each row of pods

    for (let g = 0; g < groupCount; g++) {
      const podRowIndex = Math.floor(g / groupsPerRow);
      const podColIndex = g % groupsPerRow;
      const baseRow = podRowIndex * podGapRows;
      const baseCol = podColIndex * podGapCols;

      let placed = 0;
      for (let pr = 0; pr < podRows && placed < seatsPerGroup; pr++) {
        for (let pc = 0; pc < podCols && placed < seatsPerGroup; pc++) {
          cells.push({ row: baseRow + pr, col: baseCol + pc });
          placed++;
        }
      }
    }
  } else if (body.mode === "circle") {
    // A ring of seats around a center point, e.g. for morning meeting/circle
    // time - not a discrete grid template like rows/pods, so seats are
    // placed parametrically around the circle and nudged to the nearest
    // free grid cell if two would otherwise land on top of each other.
    const seatCount = Math.max(3, Math.min(40, Number(body.seatCount) || 12));
    const radius = Math.max(3, Math.min(15, Number(body.radius) || 6));
    const taken = new Set<string>();
    const nudges: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ];
    for (let i = 0; i < seatCount; i++) {
      const angle = (2 * Math.PI * i) / seatCount - Math.PI / 2; // start at the top, go clockwise
      const baseRow = Math.round(radius + radius * Math.sin(angle));
      const baseCol = Math.round(radius + radius * Math.cos(angle));
      let placedRow = baseRow;
      let placedCol = baseCol;
      for (const [dr, dc] of nudges) {
        const key = `${baseRow + dr}:${baseCol + dc}`;
        if (!taken.has(key)) {
          placedRow = baseRow + dr;
          placedCol = baseCol + dc;
          break;
        }
      }
      taken.add(`${placedRow}:${placedCol}`);
      cells.push({ row: placedRow, col: placedCol });
    }
  } else {
    return NextResponse.json({ error: "mode must be 'rows', 'groups', or 'circle'" }, { status: 400 });
  }

  // Dedup (shouldn't happen, but just in case)
  const seen = new Set<string>();
  cells = cells.filter((c) => {
    const key = `${c.row}:${c.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Warn if any currently-seated students would be displaced (their seat
  // isn't in the new layout) - client shows this and asks for confirmation.
  const currentAssignments = await prisma.seatingAssignment.findMany({
    where: { student: { classroomId } },
    include: { student: true },
  });
  const newCellKeys = new Set(cells.map((c) => `${c.row}:${c.col}`));
  const displaced = currentAssignments
    .filter((a) => !newCellKeys.has(`${a.posY}:${a.posX}`))
    .map((a) => `${a.student.firstName} ${a.student.lastName}`);

  if (displaced.length > 0 && !body.confirm) {
    return NextResponse.json(
      {
        needsConfirmation: true,
        displaced,
        message: `${displaced.length} student(s) would be unseated by this layout: ${displaced.join(", ")}. Resend with confirm: true to proceed anyway.`,
      },
      { status: 409 }
    );
  }

  // Replace the layout: remove all existing seats, create the new set.
  // (Cascade on SeatSlot deletion doesn't touch SeatingAssignment, since
  // that's keyed on studentId/posX/posY, not a foreign key to SeatSlot - so
  // displaced students' assignment rows survive but just won't render until
  // a seat exists at their old spot again, or they're manually reseated.)
  await prisma.$transaction([
    prisma.seatSlot.deleteMany({ where: { classroomId } }),
    prisma.seatSlot.createMany({
      data: cells.map((c) => ({ classroomId, row: c.row, col: c.col })),
    }),
  ]);

  return NextResponse.json({ ok: true, seatCount: cells.length });
}
