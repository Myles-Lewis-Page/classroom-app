// Shared logic for the Pacing Guide's scheduling engine: turning a unit's
// start date + day count into actual calendar dates (skipping weekends and
// full days off), and keeping everything in sync when topics are added or a
// half-completed day inserts an extra day into the schedule.
//
// `dayNumber` (1-based, sequential) is the source of truth for ordering -
// the `date` on each PacingUnitDay is always *derived* from it via
// recomputeUnitDayDates, never edited directly, so inserting/removing a day
// anywhere in the middle just means renumbering and recomputing.

import { prisma } from "@/lib/prisma";
import { addUtcDays, isWeekend } from "@/lib/dateOnly";

// Date ranges that are NOT instructional days at all - full holidays and
// teacher work days (school is in session for staff, but not students).
// Both are skipped entirely when generating a unit's day sequence, exactly
// like a weekend. Half days are deliberately NOT included here - they're
// still instructional, just flagged in the UI.
export async function getHolidayRanges(classroomId: string) {
  const events = await prisma.calendarEvent.findMany({
    where: { classroomId, type: { in: ["holiday", "teacher_work_day"] } },
  });
  return events.map((e) => ({ startDate: e.startDate, endDate: e.endDate }));
}

/**
 * Generates `count` consecutive instructional calendar dates starting from
 * `start` (inclusive), skipping weekends and any date fully covered by a
 * "holiday" range. Half days are NOT skipped here - they're still
 * instructional time, just visually flagged in the UI.
 */
export function generateInstructionalDates(
  start: Date,
  count: number,
  holidayRanges: { startDate: Date; endDate: Date }[]
): Date[] {
  if (count <= 0) return [];
  const dates: Date[] = [];
  let cursor = new Date(start);
  const isHoliday = (d: Date) => holidayRanges.some((h) => d >= h.startDate && d <= h.endDate);
  let guard = 0;
  const guardMax = count * 20 + 3650; // safety cap, never loop forever on a bad holiday list
  while (dates.length < count && guard < guardMax) {
    guard++;
    if (!isWeekend(cursor) && !isHoliday(cursor)) {
      dates.push(new Date(cursor));
    }
    cursor = addUtcDays(cursor, 1);
  }
  return dates;
}

/** Recomputes the `date` on every PacingUnitDay of a unit, in dayNumber order. */
export async function recomputeUnitDayDates(unitId: string) {
  const unit = await prisma.pacingUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  const holidays = await getHolidayRanges(unit.classroomId);
  const days = await prisma.pacingUnitDay.findMany({
    where: { pacingUnitId: unitId },
    orderBy: { dayNumber: "asc" },
  });
  if (days.length === 0) return;
  const dates = generateInstructionalDates(unit.startDate, days.length, holidays);
  await prisma.$transaction(
    days.map((day, i) =>
      prisma.pacingUnitDay.update({ where: { id: day.id }, data: { date: dates[i] } })
    )
  );
}

/** How many instructional dates fall in [start, end] inclusive - what a unit's day count would be from its set start/end alone. */
export function countInstructionalDaysInRange(
  start: Date,
  end: Date,
  holidayRanges: { startDate: Date; endDate: Date }[]
): number {
  let count = 0;
  let cursor = new Date(start);
  const isHoliday = (d: Date) => holidayRanges.some((h) => d >= h.startDate && d <= h.endDate);
  while (cursor <= end) {
    if (!isWeekend(cursor) && !isHoliday(cursor)) count++;
    cursor = addUtcDays(cursor, 1);
  }
  return count;
}

/** The date of a unit's last (highest dayNumber) day row, or null if it has none. */
export async function getUnitLastDayDate(unitId: string): Promise<Date | null> {
  const lastDay = await prisma.pacingUnitDay.findFirst({
    where: { pacingUnitId: unitId },
    orderBy: { dayNumber: "desc" },
  });
  return lastDay ? lastDay.date : null;
}

/**
 * Only one unit runs at a time: shifts every OTHER unit in the classroom
 * that starts later than `anchorUnitId` by the same number of calendar days
 * - e.g. if a unit runs 4 days long, whatever comes next moves down 4 days
 * to avoid overlapping it. A flat shift (not a recursive per-unit cascade)
 * is correct here: every later unit's own day *count* is untouched, only
 * its position moves, so they all need to move by exactly the same amount.
 */
export async function shiftSubsequentUnits(classroomId: string, anchorUnitId: string, deltaDays: number) {
  if (!deltaDays) return;
  const anchor = await prisma.pacingUnit.findUnique({ where: { id: anchorUnitId } });
  if (!anchor) return;

  const laterUnits = await prisma.pacingUnit.findMany({
    where: { classroomId, id: { not: anchorUnitId }, startDate: { gt: anchor.startDate } },
  });

  for (const u of laterUnits) {
    await prisma.pacingUnit.update({
      where: { id: u.id },
      data: {
        startDate: addUtcDays(u.startDate, deltaDays),
        endDate: addUtcDays(u.endDate, deltaDays),
      },
    });
    await recomputeUnitDayDates(u.id);
  }
}

/**
 * Call after any change that might have moved a unit's last day (topic
 * added/removed, a day marked half-completed, an extra day removed, or its
 * dates edited directly) - compares to the last day date from before the
 * change and, if it moved, shifts every later unit by the same amount so
 * nothing ends up overlapping.
 */
export async function cascadeAfterDayCountChange(unitId: string, beforeLastDate: Date | null) {
  const unit = await prisma.pacingUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  const afterLastDate = await getUnitLastDayDate(unitId);
  if (!beforeLastDate || !afterLastDate) return;

  const deltaDays = Math.round((afterLastDate.getTime() - beforeLastDate.getTime()) / 86400000);
  if (deltaDays === 0) return;
  await shiftSubsequentUnits(unit.classroomId, unitId, deltaDays);
}

/**
 * After a topic is removed, trims blank trailing days back down to whichever
 * is longer: the unit's originally-set length, or however many days the
 * topics that are left still need. Only ever removes days that are both
 * past that target AND completely untouched (no status progress, no
 * manually-typed content, not an isExtraDay from a half-completed lesson) -
 * stops at the first day with anything real on it, so nothing real is ever
 * silently lost.
 */
export async function shrinkUnitDaysIfPossible(unitId: string) {
  const unit = await prisma.pacingUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;

  const [topics, holidays, days] = await Promise.all([
    prisma.unitTopic.findMany({ where: { unitId } }),
    getHolidayRanges(unit.classroomId),
    prisma.pacingUnitDay.findMany({ where: { pacingUnitId: unitId }, orderBy: { dayNumber: "desc" } }),
  ]);

  const topicDaysSum = topics.reduce((sum, t) => sum + t.days, 0);
  const originalSetDays = countInstructionalDaysInRange(unit.startDate, unit.endDate, holidays);
  const targetDayCount = Math.max(originalSetDays, topicDaysSum);

  if (days.length <= targetDayCount) return;

  const toDelete: string[] = [];
  for (const day of days) {
    if (day.dayNumber <= targetDayCount) break;
    const isBlank =
      day.status === "not_started" &&
      !day.isExtraDay &&
      !day.topic &&
      !day.learningTarget &&
      !day.standards &&
      !day.supports &&
      !day.lessonActivities &&
      !day.warmUp &&
      !day.materialsNeeded;
    if (!isBlank) break;
    toDelete.push(day.id);
  }
  if (toDelete.length === 0) return;

  await prisma.pacingUnitDay.deleteMany({ where: { id: { in: toDelete } } });
  await recomputeUnitDayDates(unitId);
}

/**
 * Finds the first OTHER unit in the classroom whose actual occupied range
 * (its real first-day-to-last-day span if it has generated days, else its
 * plain start/end) overlaps the given [start, end] - used to hard-block
 * creating or editing a unit into a date range another unit already
 * occupies, rather than silently cascading around it.
 */
export async function findOverlappingUnit(
  classroomId: string,
  start: Date,
  end: Date,
  excludeUnitId?: string
) {
  const units = await prisma.pacingUnit.findMany({
    where: { classroomId, ...(excludeUnitId ? { id: { not: excludeUnitId } } : {}) },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  for (const u of units) {
    const occupiedStart = u.startDate;
    const occupiedEnd = u.days.length > 0 ? u.days[u.days.length - 1].date : u.endDate;
    if (start <= occupiedEnd && occupiedStart <= end) {
      return { id: u.id, name: u.name, startDate: occupiedStart, endDate: occupiedEnd };
    }
  }
  return null;
}

/** Extends a unit's day rows (appending fresh, blank dayNumbers) so it has at least `targetCount` days. */
export async function ensureDayCount(unitId: string, targetCount: number) {
  const currentCount = await prisma.pacingUnitDay.count({ where: { pacingUnitId: unitId } });
  if (targetCount <= currentCount) return;
  const unit = await prisma.pacingUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  const toAdd = targetCount - currentCount;
  await prisma.pacingUnitDay.createMany({
    data: Array.from({ length: toAdd }, (_, i) => ({
      pacingUnitId: unitId,
      dayNumber: currentCount + i + 1,
      date: unit.startDate, // placeholder - recomputeUnitDayDates fixes this right after
    })),
  });
  await recomputeUnitDayDates(unitId);
}

/**
 * Fills the dayNumber range this topic occupies (based on its position among
 * the unit's topics, in order) with its name/target/standards/support,
 * extending the unit's day count first if the topic runs past what's
 * currently generated.
 */
export async function applyTopicToDays(unitId: string, topicId: string) {
  const allTopics = await prisma.unitTopic.findMany({
    where: { unitId },
    orderBy: { order: "asc" },
  });
  const topic = allTopics.find((t) => t.id === topicId);
  if (!topic) return;

  let startDayNumber = 1;
  for (const t of allTopics) {
    if (t.id === topicId) break;
    startDayNumber += t.days;
  }
  const endDayNumber = startDayNumber + topic.days - 1;

  await ensureDayCount(unitId, endDayNumber);

  await prisma.pacingUnitDay.updateMany({
    where: { pacingUnitId: unitId, dayNumber: { gte: startDayNumber, lte: endDayNumber } },
    data: {
      topicId: topic.id,
      topic: topic.name,
      learningTarget: topic.learningTarget,
      standards: topic.standards,
      supports: topic.support,
    },
  });
}

/** Clears a deleted topic's fields off any days that were showing it. */
export async function clearTopicFromDays(topicId: string) {
  await prisma.pacingUnitDay.updateMany({
    where: { topicId },
    data: { topicId: null, topic: null, learningTarget: null, standards: null, supports: null },
  });
}

/**
 * Clears every day's topic fields and reapplies all of a unit's remaining
 * topics in order, so they stay back-to-back starting at Day 1 with no gap
 * after one is removed from the middle.
 */
export async function reapplyAllTopics(unitId: string) {
  await prisma.pacingUnitDay.updateMany({
    where: { pacingUnitId: unitId },
    data: { topicId: null, topic: null, learningTarget: null, standards: null, supports: null },
  });
  const topics = await prisma.unitTopic.findMany({ where: { unitId }, orderBy: { order: "asc" } });
  for (const t of topics) {
    await applyTopicToDays(unitId, t.id);
  }
}

/**
 * Marks a day completed/half-completed/not-started. Half-completed inserts
 * a fresh continuation day right after it (same topic carried over), since
 * the lesson needs to spill into an extra day - every later day shifts back
 * by one and the whole unit's dates are recomputed.
 */
export async function setDayStatus(dayId: string, status: "not_started" | "completed" | "half_completed") {
  const day = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
  if (!day) return null;

  const wasHalfCompleted = day.status === "half_completed";
  await prisma.pacingUnitDay.update({ where: { id: dayId }, data: { status } });

  if (status === "half_completed" && !wasHalfCompleted) {
    const beforeLastDate = await getUnitLastDayDate(day.pacingUnitId);

    // Shift every later day up by one dayNumber, highest first, so no two
    // rows ever collide on the unique (pacingUnitId, dayNumber) constraint
    // mid-transaction.
    const laterDays = await prisma.pacingUnitDay.findMany({
      where: { pacingUnitId: day.pacingUnitId, dayNumber: { gt: day.dayNumber } },
      orderBy: { dayNumber: "desc" },
    });
    for (const later of laterDays) {
      await prisma.pacingUnitDay.update({
        where: { id: later.id },
        data: { dayNumber: later.dayNumber + 1 },
      });
    }
    await prisma.pacingUnitDay.create({
      data: {
        pacingUnitId: day.pacingUnitId,
        dayNumber: day.dayNumber + 1,
        date: day.date, // placeholder, recompute below fixes it
        topicId: day.topicId,
        topic: day.topic,
        learningTarget: day.learningTarget,
        standards: day.standards,
        supports: day.supports,
        isExtraDay: true,
      },
    });
    await recomputeUnitDayDates(day.pacingUnitId);
    await cascadeAfterDayCountChange(day.pacingUnitId, beforeLastDate);
  }

  return prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
}

/** Removes an auto-inserted extra day and closes the gap. Only ever called for isExtraDay rows. */
export async function removeExtraDay(dayId: string) {
  const day = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
  if (!day || !day.isExtraDay) return false;

  const beforeLastDate = await getUnitLastDayDate(day.pacingUnitId);

  await prisma.pacingUnitDay.delete({ where: { id: dayId } });
  const laterDays = await prisma.pacingUnitDay.findMany({
    where: { pacingUnitId: day.pacingUnitId, dayNumber: { gt: day.dayNumber } },
    orderBy: { dayNumber: "asc" },
  });
  for (const later of laterDays) {
    await prisma.pacingUnitDay.update({
      where: { id: later.id },
      data: { dayNumber: later.dayNumber - 1 },
    });
  }
  await recomputeUnitDayDates(day.pacingUnitId);
  await cascadeAfterDayCountChange(day.pacingUnitId, beforeLastDate);
  return true;
}
