import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/roleScope";
import { toDateInputValue } from "@/lib/dateOnly";

// GET - every school-wide calendar entry as a downloadable CSV, in the
// same name,startDate,endDate,type shape the import endpoint accepts -
// so exporting and re-importing (e.g. after editing in a spreadsheet)
// round-trips cleanly.
export async function GET() {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await prisma.calendarEvent.findMany({
    where: { schoolId: principal.schoolId },
    orderBy: { startDate: "asc" },
  });

  const csv = Papa.unparse({
    fields: ["name", "startDate", "endDate", "type"],
    data: events.map((e) => [e.name, toDateInputValue(e.startDate), toDateInputValue(e.endDate), e.type]),
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="school-calendar.csv"`,
    },
  });
}
