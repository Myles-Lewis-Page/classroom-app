import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/roleScope";
import { parseDateOnly } from "@/lib/dateOnly";
import { recomputeSchoolPacing } from "@/lib/pacing";

const VALID_TYPES = ["holiday", "teacher_work_day", "half_day", "other", "first_last_day", "student_holiday"];

// POST { csvText }
// Expects columns: name, startDate, endDate, type - startDate/endDate as
// YYYY-MM-DD, type one of VALID_TYPES above. Whole-school-year import: a
// full year's worth of days off, in-service days, half days, etc. in one
// upload rather than adding each one by hand. Replaces nothing - rows are
// added alongside whatever calendar entries already exist, so importing
// twice would create duplicates (not currently deduped - re-uploading the
// same file twice will double up entries - delete the old ones first if
// re-importing a corrected file.
export async function POST(req: NextRequest) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = Papa.parse<Record<string, string>>(body.csvText ?? "", {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: "CSV parse error", details: parsed.errors }, { status: 400 });
  }

  const getField = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      if (row[k]) return row[k].trim();
    }
    return "";
  };

  const rowErrors: string[] = [];
  const toCreate: { name: string; startDate: Date; endDate: Date; type: string; schoolId: string }[] = [];

  parsed.data.forEach((row, i) => {
    const name = getField(row, "name");
    const startDateRaw = getField(row, "startdate", "start date", "start");
    const endDateRaw = getField(row, "enddate", "end date", "end") || startDateRaw;
    const typeRaw = getField(row, "type").toLowerCase().replace(/\s+/g, "_");

    if (!name && !startDateRaw) return; // blank row, skip silently
    if (!name || !startDateRaw) {
      rowErrors.push(`Row ${i + 2}: name and startDate are required`);
      return;
    }
    if (!VALID_TYPES.includes(typeRaw)) {
      rowErrors.push(`Row ${i + 2}: unrecognized type "${typeRaw}" - must be one of ${VALID_TYPES.join(", ")}`);
      return;
    }
    const startDate = parseDateOnly(startDateRaw);
    const endDate = parseDateOnly(endDateRaw);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      rowErrors.push(`Row ${i + 2}: couldn't parse dates "${startDateRaw}" / "${endDateRaw}" (expected YYYY-MM-DD)`);
      return;
    }
    toCreate.push({ name, startDate, endDate, type: typeRaw, schoolId: principal.schoolId });
  });

  if (rowErrors.length > 0) {
    return NextResponse.json({ error: "Some rows couldn't be imported", details: rowErrors }, { status: 400 });
  }
  if (toCreate.length === 0) {
    return NextResponse.json({ error: "No valid rows found in that file" }, { status: 400 });
  }

  await prisma.calendarEvent.createMany({ data: toCreate });

  // One recompute pass for the whole batch, not per-row - see the
  // function's own comment for why that matters here.
  if (toCreate.some((r) => r.type === "holiday" || r.type === "teacher_work_day" || r.type === "student_holiday")) {
    await recomputeSchoolPacing(principal.schoolId);
  }

  return NextResponse.json({ ok: true, imported: toCreate.length });
}
