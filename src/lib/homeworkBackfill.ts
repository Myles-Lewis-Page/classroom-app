import { prisma } from "@/lib/prisma";

/**
 * When a student is added after assignments already exist, they'd
 * otherwise never show up on those assignments at all (entries are only
 * auto-created for students active *at the time* an assignment is made).
 * Call this right after creating a student to backfill a "missing" entry
 * for every assignment in their classroom that they're actually in scope
 * for - same scoping rule assignment creation itself uses: an assignment
 * with no Sections tagged applies to the whole classroom, otherwise only to
 * the specific Sections (Periods) it's tagged to.
 *
 * Safe to call even if some entries already exist (skipDuplicates) - e.g.
 * if this ever gets called twice for the same student.
 */
export async function backfillHomeworkEntriesForStudent(
  studentId: string,
  classroomId: string,
  sectionId: string | null
) {
  const assignments = await prisma.assignment.findMany({
    where: {
      classroomId,
      OR: [{ sections: { none: {} } }, ...(sectionId ? [{ sections: { some: { id: sectionId } } }] : [])],
    },
    select: { id: true },
  });
  if (assignments.length === 0) return;

  await prisma.homeworkEntry.createMany({
    data: assignments.map((a) => ({ assignmentId: a.id, studentId, status: "missing" })),
    skipDuplicates: true,
  });
}
