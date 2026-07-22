import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Papa from "papaparse";

// POST { classroomId, csvText }
// Expects columns: First Name, Last Name, Grade, Section (optional)
// Header names are matched case-insensitively with common variants.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Papa.parse<Record<string, string>>(body.csvText, {
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

  const rows = parsed.data.filter((r) => getField(r, "first name", "firstname", "first"));

  const created = await Promise.all(
    rows.map((row) =>
      prisma.student.create({
        data: {
          classroomId: body.classroomId,
          firstName: getField(row, "first name", "firstname", "first"),
          lastName: getField(row, "last name", "lastname", "last"),
          grade: getField(row, "grade") || "N/A",
          section: getField(row, "section") || null,
        },
      })
    )
  );

  return NextResponse.json({ imported: created.length });
}
