import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { parseDateOnly } from "@/lib/dateOnly";

// GET /api/assignments?subjectId=xxx (optional filter, like Skills)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const subjectId = req.nextUrl.searchParams.get("subjectId");
  // ?handedOut=true restricts to handed-out assignments only - used by the
  // Gradebook and Student Profile, which should never show draft assignments
  // that haven't actually been given to students yet.
  const handedOutOnly = req.nextUrl.searchParams.get("handedOut") === "true";

  const assignments = await prisma.assignment.findMany({
    where: {
      classroomId,
      ...(subjectId ? { skillSubjectId: subjectId } : {}),
      ...(handedOutOnly ? { handedOut: true } : {}),
    },
    include: {
      entries: { include: { student: true } },
      skillSubject: true,
      gradeCategory: true,
      sections: true,
      pacingUnit: { select: { id: true, name: true } },
      pacingTopic: { select: { id: true, name: true } },
    },
    orderBy: { assignedDate: "desc" },
  });

  return NextResponse.json(assignments);
}

// POST { name, assignedDate, dueDate?, subjectId?, gradingType?, maxPoints?, latePenaltyPercentPerDay? }
// classroomId derived from session. Creates the assignment and
// auto-creates a "missing" entry for every active student IN THIS
// CLASSROOM ONLY, matching the same pattern as Event Tracker.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) {
    return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });
  }

  const body = await req.json();
  const gradingType = body.gradingType === "points" ? "points" : "completion";

  // sectionIds: which Sections (subgroups) this assignment goes to. Empty/
  // missing = the whole classroom, matching the existing "no section means
  // everyone" convention used across the app.
  const sectionIds: string[] = Array.isArray(body.sectionIds) ? body.sectionIds.filter(Boolean) : [];

  const assignment = await prisma.assignment.create({
    data: {
      classroomId,
      name: body.name,
      assignedDate: parseDateOnly(body.assignedDate),
      dueDate: body.dueDate ? parseDateOnly(body.dueDate) : null,
      skillSubjectId: body.subjectId || null,
      gradeCategoryId: body.gradeCategoryId || null,
      gradingType,
      maxPoints: gradingType === "points" ? Number(body.maxPoints) || 100 : null,
      latePenaltyPercentPerDay:
        body.latePenaltyPercentPerDay !== undefined && body.latePenaltyPercentPerDay !== ""
          ? Number(body.latePenaltyPercentPerDay) || null
          : null,
      // Draft workflow: teachers can prep an assignment ahead of time and
      // only flip it visible (on Gradebook/Student Profile) once actually
      // handed out. Defaults to true so quick one-step creation still works
      // exactly like before.
      handedOut: body.handedOut === undefined ? true : !!body.handedOut,
      pacingUnitId: body.pacingUnitId || null,
      pacingTopicId: body.pacingTopicId || null,
      ...(sectionIds.length > 0 ? { sections: { connect: sectionIds.map((id) => ({ id })) } } : {}),
    },
  });

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      classroomId,
      ...(sectionIds.length > 0 ? { sectionId: { in: sectionIds } } : {}),
    },
  });
  await prisma.homeworkEntry.createMany({
    data: students.map((s) => ({
      assignmentId: assignment.id,
      studentId: s.id,
      status: "missing",
    })),
  });

  return NextResponse.json(assignment, { status: 201 });
}
