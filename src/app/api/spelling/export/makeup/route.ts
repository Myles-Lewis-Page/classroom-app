import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getMakeupRoster } from "@/lib/spelling";
import { renderMakeupTestSheets } from "@/lib/spellingPdf";
import { formatShortDate } from "@/lib/dateOnly";

// GET ?listId=xxx - one personalized makeup test sheet per student who
// missed at least one word on the first test, each with only their own
// missed words (a "shortened list") and their name at the top - all as a
// single downloadable/printable PDF, one page per student.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const listId = req.nextUrl.searchParams.get("listId");
  if (!classroomId || !listId) return NextResponse.json({ error: "listId is required" }, { status: 400 });

  const list = await prisma.spellingList.findUnique({ where: { id: listId } });
  if (!list || list.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const roster = await getMakeupRoster(listId);
  if (roster.length === 0) {
    return NextResponse.json({ error: "No one needs a makeup test for this list." }, { status: 400 });
  }

  const pdfBuffer = await renderMakeupTestSheets({
    weekLabel: `Makeup — Week of ${formatShortDate(list.weekOf)}`,
    students: roster.map((entry) => ({
      name: `${entry.student.firstName} ${entry.student.lastName}`,
      words: entry.words.map((w) => w.word),
    })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="spelling-makeup-${formatShortDate(list.weekOf).replace(/\//g, "-")}.pdf"`,
    },
  });
}
