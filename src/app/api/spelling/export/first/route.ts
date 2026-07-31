import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { renderMasterTestSheet } from "@/lib/spellingPdf";
import { formatShortDate } from "@/lib/dateOnly";

// GET ?listId=xxx - the no-name master word list for the first test, as a
// single printable PDF page. Print as many copies as she needs, or use it
// as her own read-along/answer sheet.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  const listId = req.nextUrl.searchParams.get("listId");
  if (!classroomId || !listId) return NextResponse.json({ error: "listId is required" }, { status: 400 });

  const list = await prisma.spellingList.findUnique({
    where: { id: listId },
    include: { words: { orderBy: { order: "asc" } } },
  });
  if (!list || list.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBuffer = await renderMasterTestSheet({
    weekLabel: `Week of ${formatShortDate(list.weekOf)}`,
    words: list.words.map((w) => w.word),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="spelling-test-${formatShortDate(list.weekOf).replace(/\//g, "-")}.pdf"`,
    },
  });
}
