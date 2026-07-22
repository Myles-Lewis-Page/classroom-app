import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns the logged-in teacher's id, or null if not authenticated. */
export async function getSessionTeacherId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string })?.id ?? null;
}

/**
 * Returns the current teacher's active classroom id, or null if they don't
 * have one yet (they haven't completed /profile) or aren't logged in.
 * Every data query in the app should be scoped through this - never query
 * "all students" or "all events" globally, always filter by this id so one
 * teacher can never see another teacher's class.
 */
export async function getCurrentClassroomId(): Promise<string | null> {
  const teacherId = await getSessionTeacherId();
  if (!teacherId) return null;

  const classroom = await prisma.classroom.findFirst({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return classroom?.id ?? null;
}

/**
 * Confirms a given student actually belongs to the given classroom, before
 * allowing any read/write on that student's data (profile, tags, allergies,
 * IEP, parents, etc). Prevents a teacher from accessing another classroom's
 * student just by knowing/guessing their id.
 */
export async function studentBelongsToClassroom(
  studentId: string,
  classroomId: string
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classroomId: true },
  });
  return student?.classroomId === classroomId;
}
