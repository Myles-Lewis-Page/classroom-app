// Matches the teacher's original rubric:
// 0-2 rules followed (0-40%) = red
// 3 rules followed (41-60%) = yellow
// 4-5 rules followed (61-100%) = green

export type BehaviorFlags = {
  calmBody: boolean;
  listeningEars: boolean;
  kindWords: boolean;
  stayInArea: boolean;
  finishedWork: boolean;
};

export function calculateRating(flags: BehaviorFlags): "red" | "yellow" | "green" {
  const rulesFollowed = Object.values(flags).filter(Boolean).length;

  if (rulesFollowed <= 2) return "red";
  if (rulesFollowed === 3) return "yellow";
  return "green"; // 4-5
}

export function ratingColor(rating: string | null | undefined): string {
  switch (rating) {
    case "red":
      return "#fecaca"; // pastel rose
    case "yellow":
      return "#fde68a"; // pastel amber
    case "green":
      return "#a7f3d0"; // pastel mint
    default:
      return "#e0e7ff"; // pastel lavender-gray, not yet rated
  }
}
