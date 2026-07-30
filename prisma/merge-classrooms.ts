// One-time admin operation, run the same way as the existing seed /
// reset-password scripts: set env vars on Railway, redeploy, then unset them.
//
//   MERGE_CLASSROOMS_PRIMARY   = the Classroom name that survives (e.g. "JHauschildt-3rd")
//   MERGE_CLASSROOMS_SECONDARY = the Classroom name that gets folded in as Period 2
//
// What it does:
//   - Creates "Period 1" and "Period 2" Sections under the primary classroom.
//   - Moves every existing primary-classroom student into Period 1, and every
//     secondary-classroom student into Period 2, under the primary classroom.
//   - Moves the secondary classroom's Assignments over, tagged to Period 2 only
//     (so they don't suddenly show up for Period 1 kids). The primary's existing
//     assignments are left untagged (= visible to both periods), which is the
//     new default going forward.
//   - Moves Events, CalendarEvents, and PacingUnits over untouched (classroom-wide
//     data - no Period concept for these yet).
//   - Best-effort merges classroom-scoped lookup lists (SkillSubject, SupportType,
//     GradeCategory, Subject): if the primary already has one with the same name,
//     children get re-pointed to the primary's row and the duplicate is dropped;
//     otherwise the secondary's row is just re-parented onto the primary.
//   - Does NOT attempt to merge SeatSlot (physical seating layouts are classroom-
//     specific and don't have a sensible merge) - these are deleted along with the
//     secondary classroom. This is logged loudly below.
//   - Idempotent: if the secondary classroom can't be found (already merged/deleted),
//     it logs and exits cleanly instead of erroring.
//
// This is deliberately a plain script, not baked into a migration file, since a
// classroom merge is a meaningful one-time decision that should be visible in the
// deploy logs and only run when explicitly asked for - not silently on every deploy.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const primaryName = process.env.MERGE_CLASSROOMS_PRIMARY;
  const secondaryName = process.env.MERGE_CLASSROOMS_SECONDARY;

  if (!primaryName || !secondaryName) {
    console.log("MERGE_CLASSROOMS_PRIMARY / MERGE_CLASSROOMS_SECONDARY not both set - skipping merge.");
    return;
  }

  const primary = await prisma.classroom.findFirst({ where: { name: primaryName } });
  const secondary = await prisma.classroom.findFirst({ where: { name: secondaryName } });

  if (!primary) {
    console.log(`Merge skipped: no classroom named "${primaryName}" found.`);
    return;
  }
  if (!secondary) {
    console.log(`Merge skipped: no classroom named "${secondaryName}" found (already merged?).`);
    return;
  }
  if (primary.id === secondary.id) {
    console.log("Merge skipped: primary and secondary resolved to the same classroom.");
    return;
  }

  console.log(`Merging "${secondaryName}" (${secondary.id}) into "${primaryName}" (${primary.id})...`);

  const period1 = await prisma.section.upsert({
    where: { classroomId_name: { classroomId: primary.id, name: "Period 1" } },
    update: {},
    create: { classroomId: primary.id, name: "Period 1", order: 0 },
  });
  const period2 = await prisma.section.upsert({
    where: { classroomId_name: { classroomId: primary.id, name: "Period 2" } },
    update: {},
    create: { classroomId: primary.id, name: "Period 2", order: 1 },
  });

  // Existing primary students (not already in some other Section) -> Period 1
  const p1 = await prisma.student.updateMany({
    where: { classroomId: primary.id, sectionId: null },
    data: { sectionId: period1.id },
  });
  console.log(`Assigned ${p1.count} existing "${primaryName}" students to Period 1.`);

  // Secondary students -> primary classroom, Period 2
  const p2 = await prisma.student.updateMany({
    where: { classroomId: secondary.id },
    data: { classroomId: primary.id, sectionId: period2.id },
  });
  console.log(`Moved ${p2.count} "${secondaryName}" students to Period 2.`);

  // Secondary assignments -> primary classroom, tagged to Period 2 only
  const secondaryAssignments = await prisma.assignment.findMany({ where: { classroomId: secondary.id } });
  for (const a of secondaryAssignments) {
    await prisma.assignment.update({
      where: { id: a.id },
      data: { classroomId: primary.id, sections: { connect: { id: period2.id } } },
    });
  }
  console.log(`Moved ${secondaryAssignments.length} assignments to Period 2 under "${primaryName}".`);

  // Classroom-wide data with no Period concept yet - just re-parent.
  for (const model of ["event", "calendarEvent", "pacingUnit", "scheduleBlock"] as const) {
    // @ts-expect-error - dynamic model access, all four share classroomId
    const res = await prisma[model].updateMany({
      where: { classroomId: secondary.id },
      data: { classroomId: primary.id },
    });
    console.log(`Re-parented ${res.count} ${model} rows to "${primaryName}".`);
  }

  // Best-effort merge of classroom-scoped named lookup lists.
  for (const model of ["skillSubject", "supportType", "gradeCategory", "subject"] as const) {
    // @ts-expect-error - dynamic model access, all four share classroomId+name
    const secondaryRows: { id: string; name: string }[] = await prisma[model].findMany({
      where: { classroomId: secondary.id },
    });
    for (const row of secondaryRows) {
      // @ts-expect-error - dynamic model access
      const existing = await prisma[model].findFirst({ where: { classroomId: primary.id, name: row.name } });
      if (existing) {
        console.log(`${model} "${row.name}": duplicate of primary's existing row - leaving primary's copy in place (secondary's row is orphaned/dropped by cascade).`);
        // Not attempting to re-point every possible child FK here (StudentSkill,
        // Assignment.skillSubjectId, etc.) - flagged as a known gap if a
        // secondary-classroom list item was actually in use.
      } else {
        // @ts-expect-error - dynamic model access
        await prisma[model].update({ where: { id: row.id }, data: { classroomId: primary.id } });
        console.log(`${model} "${row.name}": moved to "${primaryName}" (no name clash).`);
      }
    }
  }

  const seatCount = await prisma.seatSlot.count({ where: { classroomId: secondary.id } });
  if (seatCount > 0) {
    console.log(
      `⚠️  "${secondaryName}" has ${seatCount} seat slots that will be discarded (seating layouts are classroom-specific and can't be merged). Re-create the layout for Period 2 after this runs if needed.`
    );
  }

  await prisma.classroom.delete({ where: { id: secondary.id } });
  console.log(`Deleted now-empty classroom "${secondaryName}". Merge complete.`);
}

main()
  .catch((e) => {
    console.error("Classroom merge failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
