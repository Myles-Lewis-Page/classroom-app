// Skill mastery is tracked on a 0-5 scale (0 = not started, 5 = fully
// mastered). This maps a rating to a pastel color for the grid dots.

export const RATING_VALUES = [0, 1, 2, 3, 4, 5] as const;

export function ratingScaleColor(rating: number): string {
  switch (rating) {
    case 0:
      return "#ede9fe"; // not started - light lavender
    case 1:
      return "#fecaca"; // rose
    case 2:
      return "#fed7aa"; // orange
    case 3:
      return "#fde68a"; // amber
    case 4:
      return "#bef264"; // lime
    case 5:
      return "#a7f3d0"; // mint - fully mastered
    default:
      return "#ede9fe";
  }
}

export function parseRating(status: string | undefined): number {
  const n = Number(status);
  return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
}
