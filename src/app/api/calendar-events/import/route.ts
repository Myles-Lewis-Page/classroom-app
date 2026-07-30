import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";
import { recomputeUnitDayDates, getUnitLastDayDate, cascadeAfterDayCountChange } from "@/lib/pacing";

const VALID_TYPES = ["holiday", "teacher_work_day", "half_day", "other"];

// POST { csvText }
// Expects columns: name, startDate, endDate (optional - defaults to
// startDate), type (one of holiday/teacher_work_day/half_day/other -
// defaults to "other" if missing or not recognized). Header names are
// matched case-insensitively.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = Papa.parse<Record<string, string>>(body.csvText ?? "", {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: "Couldn't read that file as CSV", details: parsed.errors }, { status: 400 });
  }

  const getField = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      if (row[k]) return row[k].trim();
    }
    return "";
  };

  let imported = 0;
  let skipped = 0;
  let sawHolidayOrWorkDay = false;

  for (const row of parsed.data) {
    const name = getField(row, "name", "event", "title");
    const startStr = getField(row, "startdate", "start date", "start", "date");
    const endStr = getField(row, "enddate", "end date", "end");
    const typeRaw = getField(row, "type").toLowerCase();

    if (!name || !startStr) {
      skipped++;
      continue;
    }

    const startDate = parseDateOnly(startStr);
    if (isNaN(startDate.getTime())) {
      skipped++;
      continue;
    }
    const endDate = endStr ? parseDateOnly(endStr) : startDate;
    const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "other";

    await prisma.calendarEvent.create({
      data: { classroomId, name, startDate, endDate, type },
    });
    imported++;
    if (type === "holiday" || type === "teacher_work_day") sawHolidayOrWorkDay = true;
  }

  if (sawHolidayOrWorkDay) {
    const units = await prisma.pacingUnit.findMany({
      where: { classroomId },
      select: { id: true },
      orderBy: { startDate: "asc" },
    });
    for (const u of units) {
      const beforeLastDate = await getUnitLastDayDate(u.id);
      await recomputeUnitDayDates(u.id);
      await cascadeAfterDayCountChange(u.id, beforeLastDate);
    }
  }

  return NextResponse.json({ imported, skipped });
}
