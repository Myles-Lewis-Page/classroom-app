// Shared grade-percent calculation, used everywhere a HomeworkEntry needs
// to be turned into a 0-100 grade: the Gradebook, the Assignments list, the
// per-assignment grading page, and the student profile. Centralized so the
// late-penalty math can't drift out of sync between pages.

export type GradableAssignment = {
  gradingType: string; // "points" | "completion"
  maxPoints: number | null;
  dueDate: string | Date | null;
  latePenaltyPercentPerDay?: number | null;
};

export type GradableEntry = {
  status: string; // "missing" | "handed_in"
  submittedAt: string | Date | null;
  gradeStatus: string | null; // "complete" | "incomplete"
  gradeScore: number | null;
};

/**
 * Whole days late (0 if on time, not late, or there's nothing to compare).
 * Both dueDate and submittedAt are stored as UTC-midnight "calendar dates"
 * with no meaningful time-of-day (see the status route for why that matters
 * for submittedAt specifically), so the gap between them is always a clean
 * whole number of days - no rounding surprises from comparing a precise
 * timestamp against a date-only value.
 */
export function daysLate(assignment: GradableAssignment, entry: GradableEntry): number {
  if (!assignment.dueDate || !entry.submittedAt) return 0;
  const due = new Date(assignment.dueDate);
  const submitted = new Date(entry.submittedAt);
  if (submitted <= due) return 0;
  return Math.round((submitted.getTime() - due.getTime()) / 86400000);
}

/** The raw grade percent (0-100) before any late penalty, or null if ungraded. */
export function rawGradePercent(assignment: GradableAssignment, entry: GradableEntry): number | null {
  if (assignment.gradingType === "points") {
    if (entry.gradeScore === null || !assignment.maxPoints) return null;
    return (entry.gradeScore / assignment.maxPoints) * 100;
  }
  if (entry.gradeStatus === "complete") return 100;
  if (entry.gradeStatus === "incomplete") return 0;
  return null;
}

/**
 * The grade percent (0-100, rounded) after applying the assignment's late
 * penalty, if any and if it applies. Null if there's nothing to grade yet.
 */
export function effectiveGradePercent(assignment: GradableAssignment, entry: GradableEntry): number | null {
  const raw = rawGradePercent(assignment, entry);
  if (raw === null) return null;

  const penalty = assignment.latePenaltyPercentPerDay;
  if (!penalty) return Math.round(raw);

  const late = daysLate(assignment, entry);
  if (late === 0) return Math.round(raw);

  return Math.round(Math.max(0, raw - penalty * late));
}
