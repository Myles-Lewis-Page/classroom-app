import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// Data minimization for the substitute packet: this can end up printed on
// paper or shown on a shared computer to someone who isn't a school
// employee, so it should carry the minimum a substitute actually needs -
// not the full student record. In particular:
//   - IEP/504: flag-only ("has one") - no accommodation text, no case
//     manager, no goals. A substitute doesn't administer accommodations;
//     the classroom teacher or a case manager does.
//   - Allergies: allergen name + severity are kept (a substitute genuinely
//     needs to know "peanut, severe" to respond correctly in an actual
//     reaction) but the free-text `reaction` field is dropped - that's
//     clinical detail past what's needed for a first response.
//   - Dietary restrictions: name only, already minimal.
// This trimming happens here, server-side, rather than just hiding fields
// in the page component - so the extra detail never leaves the server in
// the API response at all.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ students: [], subjects: [] });

  const [rawStudents, subjects] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true, classroomId },
      include: {
        allergies: { select: { allergen: true, severity: true } },
        dietaryRestrictions: { select: { restriction: true } },
        ieps: { select: { id: true } },
        seatingAssignment: true,
        observations: { orderBy: { date: "desc" }, take: 2, select: { note: true } },
      },
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.subject.findMany({ where: { classroomId }, orderBy: { order: "asc" } }),
  ]);

  const students = rawStudents.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    sectionId: s.sectionId,
    allergies: s.allergies,
    dietaryRestrictions: s.dietaryRestrictions,
    hasIep: s.ieps.length > 0,
    seatingAssignment: s.seatingAssignment,
    observations: s.observations,
  }));

  return NextResponse.json({ students, subjects });
}
