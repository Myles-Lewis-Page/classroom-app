import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST full student payload:
// {
//   firstName, lastName, grade, section, dob, understandingLevel,
//   tagIds: string[],
//   allergies: [{ allergen, severity, reaction, notes }],
//   dietaryRestrictions: [{ restriction, notes }],
//   ieps: [{ type, accommodations, serviceMinutes, goals, caseManager, reviewDate, subSafeSummary }],
//   parents: [{ name, relationship, phone, email, preferredContact, isEmergencyContact, notes }]
// }
// (classroomId is derived from the session, never trusted from the client)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();

  const student = await prisma.student.create({
    data: {
      classroomId,
      firstName: body.firstName,
      lastName: body.lastName,
      grade: body.grade,
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

  return NextResponse.json(student, { status: 201 });
}
