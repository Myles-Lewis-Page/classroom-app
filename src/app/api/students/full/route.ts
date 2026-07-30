import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { backfillHomeworkEntriesForStudent } from "@/lib/homeworkBackfill";

// POST full student payload:
// {
//   classroomId? (which of the teacher's classrooms - defaults to current),
//   sectionId? (which Period within that classroom, if any),
//   firstName, lastName, grade?, section, dob, understandingLevel,
//   tagIds: string[],
//   allergies: [{ allergen, severity, reaction, notes }],
//   dietaryRestrictions: [{ restriction, notes }],
//   ieps: [{ type, accommodations, serviceMinutes, goals, caseManager, reviewDate, subSafeSummary }],
//   parents: [{ name, relationship, phone, email, preferredContact, isEmergencyContact, notes }]
// }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  const body = await req.json();

  // A student can be tagged straight into any of the teacher's own
  // classrooms at creation time, not just whichever one is currently
  // active - verified against ownership before trusting it.
  let classroomId = await getCurrentClassroomId();
  if (body.classroomId && teacherId) {
    const owned = await prisma.classroom.findFirst({ where: { id: body.classroomId, teacherId } });
    if (owned) classroomId = owned.id;
  }
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  // The chosen Period has to actually belong to the chosen classroom.
  let sectionId: string | null = null;
  if (body.sectionId) {
    const ownedSection = await prisma.section.findFirst({ where: { id: body.sectionId, classroomId } });
    if (ownedSection) sectionId = ownedSection.id;
  }

  const student = await prisma.student.create({
    data: {
      classroomId,
      sectionId,
      firstName: body.firstName,
      lastName: body.lastName,
      grade: body.grade || null,
      section: body.section || null,
      dob: body.dob ? new Date(body.dob) : null,
      understandingLevel: body.understandingLevel ? Number(body.understandingLevel) : null,
      tags: body.tagIds?.length
        ? { create: body.tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
      allergies: body.allergies?.length
        ? {
            create: body.allergies.map(
              (a: { allergen: string; severity: string; reaction?: string; notes?: string }) => ({
                allergen: a.allergen,
                severity: a.severity,
                reaction: a.reaction || null,
                notes: a.notes || null,
              })
            ),
          }
        : undefined,
      dietaryRestrictions: body.dietaryRestrictions?.length
        ? {
            create: body.dietaryRestrictions.map((d: { restriction: string; notes?: string }) => ({
              restriction: d.restriction,
              notes: d.notes || null,
            })),
          }
        : undefined,
      ieps: body.ieps?.length
        ? {
            create: body.ieps.map(
              (i: {
                type: string;
                accommodations: string;
                serviceMinutes?: string;
                goals?: string;
                caseManager?: string;
                reviewDate?: string;
                subSafeSummary?: string;
              }) => ({
                type: i.type,
                accommodations: i.accommodations,
                serviceMinutes: i.serviceMinutes || null,
                goals: i.goals || null,
                caseManager: i.caseManager || null,
                reviewDate: i.reviewDate ? new Date(i.reviewDate) : null,
                subSafeSummary: i.subSafeSummary || null,
              })
            ),
          }
        : undefined,
      parents: body.parents?.length
        ? {
            create: body.parents.map(
              (p: {
                name: string;
                relationship: string;
                phone?: string;
                email?: string;
                preferredContact?: string;
                isEmergencyContact?: boolean;
                notes?: string;
              }) => ({
                name: p.name,
                relationship: p.relationship,
                phone: p.phone || null,
                email: p.email || null,
                preferredContact: p.preferredContact || null,
                isEmergencyContact: !!p.isEmergencyContact,
                notes: p.notes || null,
              })
            ),
          }
        : undefined,
    },
  });

  await backfillHomeworkEntriesForStudent(student.id, classroomId, sectionId);

  return NextResponse.json(student, { status: 201 });
}
