import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      allergies: true,
      dietaryRestrictions: true,
      ieps: true,
      parents: true,
      relationshipsFrom: { include: { relatedStudent: true } },
      relationshipsTo: { include: { student: true } },
      observations: { orderBy: { date: "desc" }, take: 20 },
      praiseNotes: { orderBy: { date: "desc" }, take: 20 },
      attendanceEntries: { orderBy: { date: "desc" }, take: 30 },
      homeworkEntries: {
        where: { assignment: { handedOut: true } },
        orderBy: { assignment: { assignedDate: "desc" } },
        take: 30,
        include: { assignment: { include: { gradeCategory: true } } },
      },
      behaviorEntries: { orderBy: { date: "desc" }, take: 30, include: { subject: true } },
      behaviorNotes: {
        orderBy: { date: "desc" },
        take: 30,
        include: { subject: true, contactLog: true },
      },
      parentContactLogs: { orderBy: { date: "desc" }, take: 20 },
      supports: { include: { supportType: true, selectedOption: true } },
      skillStatuses: {
        include: { skill: { include: { skillSubject: true } } },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Full skills list for the parent-facing progress view - every skill in
  // the classroom's active subjects, not just ones she's rated yet, with
  // its actual 0-5 status (defaulting to 0 for a skill never touched).
  // Kept separate from `skillStatuses` above (mastered-relevant history)
  // rather than replacing it, since other pages may still want just the
  // touched/mastered subset.
  const allSkills = await prisma.skill.findMany({
    where: { skillSubject: { classroomId, isActive: true } },
    include: { skillSubject: true },
    orderBy: [{ skillSubject: { order: "asc" } }, { category: "asc" }, { order: "asc" }],
  });
  const statusBySkillId = new Map(student.skillStatuses.map((s) => [s.skillId, s.status]));
  const allSkillsWithStatus = allSkills.map((skill) => ({
    id: skill.id,
    skillName: skill.skillName,
    category: skill.category,
    skillSubject: { id: skill.skillSubject.id, name: skill.skillSubject.name },
    status: statusBySkillId.get(skill.id) ?? "0",
  }));

  return NextResponse.json({ ...student, allSkillsWithStatus });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = (session.user as { id?: string })?.id;
  const { id } = await params;

  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  // Moving a student to a different classroom (a real class, not a Period)
  // has to be one of the teacher's own classrooms - never trust a raw id
  // from the client. If they're moving classrooms, their old Period no
  // longer applies unless a new one (already validated below) is given.
  let targetClassroomId = classroomId;
  if (body.classroomId !== undefined && body.classroomId !== classroomId) {
    const owned = teacherId
      ? await prisma.classroom.findFirst({ where: { id: body.classroomId, teacherId } })
      : null;
    if (!owned) return NextResponse.json({ error: "Invalid classroomId" }, { status: 400 });
    targetClassroomId = owned.id;
  }

  // A given sectionId (Period) has to actually belong to the target
  // classroom - otherwise it's silently dropped rather than erroring, since
  // this happens naturally when moving classrooms without picking a new one.
  let sectionId: string | null | undefined = undefined;
  if (body.sectionId !== undefined) {
    if (body.sectionId) {
      const ownedSection = await prisma.section.findFirst({
        where: { id: body.sectionId, classroomId: targetClassroomId },
      });
      sectionId = ownedSection ? ownedSection.id : null;
    } else {
      sectionId = null;
    }
  } else if (targetClassroomId !== classroomId) {
    sectionId = null; // classroom changed but no new Period specified - clear the stale one
  }

  const data: Record<string, unknown> = {};
  const allowedFields = [
    "firstName",
    "lastName",
    "grade",
    "section",
    "dob",
    "understandingLevel",
    "isActive",
    "photoConsent",
  ] as const;
  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (targetClassroomId !== classroomId) data.classroomId = targetClassroomId;
  if (sectionId !== undefined) data.sectionId = sectionId;

  const student = await prisma.student.update({
    where: { id },
    data,
  });

  // If the student was just removed from the class, free up their seat too
  // rather than leaving a "ghost" assignment behind. Same when moving
  // classrooms outright - the old classroom's physical seat doesn't apply.
  if (body.isActive === false || targetClassroomId !== classroomId) {
    await prisma.seatingAssignment.deleteMany({ where: { studentId: id } });
  }

  return NextResponse.json(student);
}
