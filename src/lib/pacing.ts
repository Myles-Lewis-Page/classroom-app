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
  }

  return prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
}

/** Removes an auto-inserted extra day and closes the gap. Only ever called for isExtraDay rows. */
export async function removeExtraDay(dayId: string) {
  const day = await prisma.pacingUnitDay.findUnique({ where: { id: dayId } });
  if (!day || !day.isExtraDay) return false;

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
  return true;
}
