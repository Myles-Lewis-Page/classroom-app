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
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { teacher: { select: { schoolId: true } } },
  });
  const schoolId = classroom?.teacher?.schoolId;
  const events = await prisma.calendarEvent.findMany({
    where: {
      type: { in: ["holiday", "teacher_work_day"] },
      OR: [{ classroomId }, ...(schoolId ? [{ schoolId }] : [])],
    },
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

/** Snapshot of a unit's day state, captured before a change, for cascadeAfterChange to diff against. */
export async function captureUnitDayState(unitId: string): Promise<{ count: number; lastDate: Date | null }> {
  const [count, lastDate] = await Promise.all([
    prisma.pacingUnitDay.count({ where: { pacingUnitId: unitId } }),
    getUnitLastDayDate(unitId),
  ]);
  return { count, lastDate };
}

/** Walks `n` instructional days forward (or back, if negative) from `date`, skipping weekends/holidays. */
export function addInstructionalDays(
  date: Date,
  n: number,
  holidayRanges: { startDate: Date; endDate: Date }[]
): Date {
  if (n === 0) return date;
  const isHoliday = (d: Date) => holidayRanges.some((h) => d >= h.startDate && d <= h.endDate);
  let cursor = date;
  let remaining = Math.abs(n);
  const step = n > 0 ? 1 : -1;
  while (remaining > 0) {
    cursor = addUtcDays(cursor, step);
    if (!isWeekend(cursor) && !isHoliday(cursor)) remaining--;
  }
  return cursor;
}

/**
 * Only one unit runs at a time: shifts every OTHER unit in the classroom
 * that starts later than `anchorUnitId`, so nothing ends up overlapping.
 * `unit` is a school-day count here (not calendar days) - e.g. a unit that
 * runs one extra school day pushes what comes next by exactly one school
 * day, even if that day happens to land right before a weekend and the
 * calendar gap is really three days. A flat shift (not a recursive
 * per-unit cascade) is correct: every later unit's own day *count* is
 * untouched, only its position moves, so they all move by the same amount.
 */
export async function shiftSubsequentUnitsByInstructionalDays(
  classroomId: string,
  anchorUnitId: string,
  deltaSchoolDays: number
) {
  if (!deltaSchoolDays) return;
  const anchor = await prisma.pacingUnit.findUnique({ where: { id: anchorUnitId } });
  if (!anchor) return;

  const holidays = await getHolidayRanges(classroomId);
  const laterUnits = await prisma.pacingUnit.findMany({
    where: { classroomId, id: { not: anchorUnitId }, startDate: { gt: anchor.startDate } },
  });

  for (const u of laterUnits) {
    await prisma.pacingUnit.update({
      where: { id: u.id },
      data: {
        startDate: addInstructionalDays(u.startDate, deltaSchoolDays, holidays),
        endDate: addInstructionalDays(u.endDate, deltaSchoolDays, holidays),
      },
    });
    await recomputeUnitDayDates(u.id);
  }
}

/** Same idea, but for shifts measured in literal calendar days (see cascadeAfterChange for when this applies instead). */
export async function shiftSubsequentUnitsByCalendarDays(
  classroomId: string,
  anchorUnitId: string,
  deltaCalendarDays: number
) {
  if (!deltaCalendarDays) return;
  const anchor = await prisma.pacingUnit.findUnique({ where: { id: anchorUnitId } });
  if (!anchor) return;

  const laterUnits = await prisma.pacingUnit.findMany({
    where: { classroomId, id: { not: anchorUnitId }, startDate: { gt: anchor.startDate } },
  });

  for (const u of laterUnits) {
    await prisma.pacingUnit.update({
      where: { id: u.id },
      data: {
        startDate: addUtcDays(u.startDate, deltaCalendarDays),
        endDate: addUtcDays(u.endDate, deltaCalendarDays),
      },
    });
    await recomputeUnitDayDates(u.id);
  }
}

/**
 * Call after any change that might have moved a unit's last day (topic
 * added/removed, a day marked half-completed, an extra day removed, a
 * calendar holiday added/removed, or its dates edited directly) - diffs
 * against a `captureUnitDayState()` snapshot taken before the change and
 * cascades to later units if needed.
 *
 * Two different things can have happened, and they need different units of
 * measurement to shift correctly:
 *  - The instructional day COUNT changed (a topic grew/shrank the unit, a
 *    half-completed day inserted/removed an extra day) - shift later units
 *    by that many SCHOOL days, so "one extra teaching day" only ever pushes
 *    things by one school day, never inflated by a weekend it happens to
 *    land next to.
 *  - The day count is the same but the last day's actual DATE moved (a
 *    holiday got inserted or removed mid-unit, so the same number of
 *    lessons now needs more or fewer calendar days to fit) - shift later
 *    units by that calendar-day gap instead, since that's what's actually
 *    needed to keep them from overlapping.
 */
export async function cascadeAfterChange(unitId: string, before: { count: number; lastDate: Date | null }) {
  const unit = await prisma.pacingUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  const after = await captureUnitDayState(unitId);

  const countDelta = after.count - before.count;
  if (countDelta !== 0) {
    await shiftSubsequentUnitsByInstructionalDays(unit.classroomId, unitId, countDelta);
    return;
  }

  if (before.lastDate && after.lastDate) {
    const calendarDelta = Math.round((after.lastDate.getTime() - before.lastDate.getTime()) / 86400000);
    if (calendarDelta !== 0) {
      await shiftSubsequentUnitsByCalendarDays(unit.classroomId, unitId, calendarDelta);
    }
  }
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
 * "Mark unit done early": the teacher is wrapping up a unit before reaching
 * every day that was originally planned for it (e.g. the class moved faster
 * than expected). Trims every trailing day that hasn't actually been
 * progressed (status still "not_started"), always leaving at least Day 1,
 * updates the unit's own endDate to match its new true last day (so it
 * stops showing as "drifted" against its set dates), and cascades every
 * later unit up to fill the freed school days - the exact inverse of a unit
 * running long and pushing things back.
 */
export async function finishUnitEarly(unitId: string): Promise<{ removedDays: number }> {
  const before = await captureUnitDayState(unitId);

  const days = await prisma.pacingUnitDay.findMany({
    where: { pacingUnitId: unitId },
    orderBy: { dayNumber: "desc" },
  });

  const toDelete: string[] = [];
  for (const day of days) {
    if (day.status !== "not_started") break; // stop at the last real progress
    if (day.dayNumber === 1) break; // never trim down to zero days
    toDelete.push(day.id);
  }

  if (toDelete.length > 0) {
    await prisma.pacingUnitDay.deleteMany({ where: { id: { in: toDelete } } });
    await recomputeUnitDayDates(unitId);
    const lastDate = await getUnitLastDayDate(unitId);
    if (lastDate) {
      await prisma.pacingUnit.update({ where: { id: unitId }, data: { endDate: lastDate } });
    }
    await cascadeAfterChange(unitId, before);
  }

  return { removedDays: toDelete.length };
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
    const before = await captureUnitDayState(day.pacingUnitId);

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
    await cascadeAfterChange(day.pacingUnitId, before);
  }

  return prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
}

/**
 * Same idea as setDayStatus, but scoped to one Period only - lets a Period
 * progress at its own pace through the SAME shared day/topic sequence, e.g.
 * one Period running behind another. Never touches the shared PacingUnitDay
 * row itself or cascades later units - but marking half_completed DOES give
 * this one Period a real, plannable extra day (a PeriodExtraDay row, fully
 * separate from the shared table - see that model's comment for why),
 * inheriting the spilled-from day's topic/standards/supports as a starting
 * point. Symmetric in both directions: un-marking half_completed removes
 * that same day's own extra day again (tracked via spilledFromDayId, so
 * marking two different days half_completed and un-marking one never
 * touches the other's extra day).
 */
export async function setDayStatusForSection(
  dayId: string,
  sectionId: string,
  status: "not_started" | "completed" | "half_completed"
) {
  const existing = await prisma.pacingUnitDayPeriod.findUnique({
    where: { pacingUnitDayId_sectionId: { pacingUnitDayId: dayId, sectionId } },
  });
  const wasHalfCompleted = existing?.status === "half_completed";

  const updated = await prisma.pacingUnitDayPeriod.upsert({
    where: { pacingUnitDayId_sectionId: { pacingUnitDayId: dayId, sectionId } },
    update: { status },
    create: { pacingUnitDayId: dayId, sectionId, status },
  });

  if (status === "half_completed" && !wasHalfCompleted) {
    const day = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
    const unit = day ? await prisma.pacingUnit.findUnique({ where: { id: day.pacingUnitId } }) : null;
    if (day && unit) {
      const holidays = await getHolidayRanges(unit.classroomId);
      // Chain off this Period's own latest extra day if it already has one
      // queued, otherwise off the shared schedule's real last day - either
      // way the new day lands right after whatever this Period's calendar
      // currently ends on.
      const latestExtra = await prisma.periodExtraDay.findFirst({
        where: { pacingUnitId: day.pacingUnitId, sectionId },
        orderBy: { date: "desc" },
      });
      const baseDate = latestExtra ? new Date(latestExtra.date) : (await getUnitLastDayDate(day.pacingUnitId)) ?? day.date;
      const nextDate = addInstructionalDays(baseDate, 1, holidays);
      await prisma.periodExtraDay.create({
        data: {
          pacingUnitId: day.pacingUnitId,
          sectionId,
          spilledFromDayId: day.id,
          date: nextDate,
          topic: day.topic,
          learningTarget: day.learningTarget,
          standards: day.standards,
          supports: day.supports,
          materialsNeeded: day.materialsNeeded,
        },
      });
    }
  } else if (status !== "half_completed" && wasHalfCompleted) {
    // Only removes ITS OWN extra day (matched by which shared day spilled
    // it), and only if still untouched - never silently deletes a day the
    // teacher has actually started planning on.
    const toRemove = await prisma.periodExtraDay.findFirst({
      where: { spilledFromDayId: dayId, sectionId, status: "not_started" },
      orderBy: { date: "desc" },
    });
    if (toRemove) {
      await prisma.periodExtraDay.delete({ where: { id: toRemove.id } });
    }
  }

  return updated;
}

/**
 * A given Period's own "actually ends" date for a unit - the latest of its
 * real extra days if it has any, otherwise derived from a finish-early
 * offset if it finished ahead of the shared schedule itself, otherwise null
 * (still exactly on the shared schedule).
 */
export async function getPeriodModifiedEndDate(
  unitId: string,
  sectionId: string,
  classroomId: string
): Promise<Date | null> {
  const latestExtra = await prisma.periodExtraDay.findFirst({
    where: { pacingUnitId: unitId, sectionId },
    orderBy: { date: "desc" },
  });
  if (latestExtra) return latestExtra.date;

  const offset = await prisma.periodPacingOffset.findUnique({
    where: { pacingUnitId_sectionId: { pacingUnitId: unitId, sectionId } },
  });
  if (!offset || offset.extraDays === 0) return null;

  const sharedLastDate = await getUnitLastDayDate(unitId);
  if (!sharedLastDate) return null;

  const holidays = await getHolidayRanges(classroomId);
  return addInstructionalDays(sharedLastDate, offset.extraDays, holidays);
}

/** How many days ahead (negative) or behind (positive) a Period is tracked as being on a unit - 0 if exactly on the shared schedule. */
export async function getPeriodDayDelta(unitId: string, sectionId: string): Promise<number> {
  const extraCount = await prisma.periodExtraDay.count({ where: { pacingUnitId: unitId, sectionId } });
  if (extraCount > 0) return extraCount;
  const offset = await prisma.periodPacingOffset.findUnique({
    where: { pacingUnitId_sectionId: { pacingUnitId: unitId, sectionId } },
  });
  return offset?.extraDays ?? 0;
}

/**
 * Per-Period "mark done early": unlike the shared finishUnitEarly, this
 * never touches the shared PacingUnitDay rows or cascades other units.
 * First trims this Period's own trailing, untouched extra days (giving back
 * days it turned out not to need after all); if it has none to trim, it's
 * genuinely finishing ahead of the shared schedule itself, so that gets
 * tracked as a negative offset instead - the mirror image of the days
 * marking half_completed builds up.
 */
export async function finishUnitEarlyForSection(
  unitId: string,
  sectionId: string
): Promise<{ savedDays: number }> {
  const extras = await prisma.periodExtraDay.findMany({
    where: { pacingUnitId: unitId, sectionId },
    orderBy: { date: "desc" },
  });
  const toDelete: string[] = [];
  for (const e of extras) {
    if (e.status !== "not_started") break;
    toDelete.push(e.id);
  }
  if (toDelete.length > 0) {
    await prisma.periodExtraDay.deleteMany({ where: { id: { in: toDelete } } });
    return { savedDays: toDelete.length };
  }

  const days = await prisma.pacingUnitDay.findMany({
    where: { pacingUnitId: unitId },
    orderBy: { dayNumber: "desc" },
    include: { periodStatuses: { where: { sectionId } } },
  });

  let savedDays = 0;
  for (const day of days) {
    const effectiveStatus = day.periodStatuses[0]?.status ?? day.status;
    if (effectiveStatus !== "not_started") break;
    if (day.dayNumber === 1) break;
    savedDays++;
  }

  if (savedDays > 0) {
    await prisma.periodPacingOffset.upsert({
      where: { pacingUnitId_sectionId: { pacingUnitId: unitId, sectionId } },
      update: { extraDays: { decrement: savedDays } },
      create: { pacingUnitId: unitId, sectionId, extraDays: -savedDays },
    });
  }

  return { savedDays };
}


export async function removeExtraDay(dayId: string) {
  const day = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
  if (!day || !day.isExtraDay) return false;

  const before = await captureUnitDayState(day.pacingUnitId);

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
  await cascadeAfterChange(day.pacingUnitId, before);
  return true;
}
