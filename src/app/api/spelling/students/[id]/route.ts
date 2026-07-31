import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId, studentBelongsToClassroom } from "@/lib/classroomScope";
import { getStudentSpellingSummary } from "@/lib/spelling";

// GET - one student's spelling history: which words they currently know
// vs. don't yet, based on their most recent attempt at each word (a
// makeup-day correction overrides the original miss). Used by the Student
// Profile page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await studentBelongsToClassroom(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = await getStudentSpellingSummary(id);
  return NextResponse.json(summary);
}
