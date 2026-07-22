import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const students = await prisma.student.findMany({
    where: { isActive: true, classroomId },
    include: { tags: { include: { tag: true } }, allergies: true },
    orderBy: [{ lastName: "asc" }],
  });

  const header = ["First Name", "Last Name", "Grade", "Section", "Tags", "Allergies"];
  const rows = students.map((s) => [
    s.firstName,
    s.lastName,
    s.grade,
    s.section ?? "",
    s.tags.map((t) => t.tag.name).join(";"),
    s.allergies.map((a) => a.allergen).join(";"),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="roster-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
