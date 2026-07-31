// Seasonal theming for the newsletter banner - a 3-stop color gradient per
// month plus a couple of decorative icons matching that month's general
// feel (including the big holidays that fall in it). Deliberately secular
// throughout, even for months with major religious holidays in them
// (December, etc.) - trees, snowmen, snowflakes, hearts, shamrocks,
// pumpkins and the like, never a cross, Star of David, menorah, or other
// religious iconography. This mirrors how public elementary classrooms
// generally decorate: seasonal and festive, not tied to any one faith.
export type MonthTheme = {
  name: string;
  gradient: [string, string, string];
  icon: "snowflake" | "heart" | "shamrock" | "umbrella" | "flower" | "sun" | "leaf" | "pumpkin" | "acorn" | "tree" | "snowman" | "firework";
  // Some months' gradients pass through a light/white tone in the middle
  // (July's red-white-blue, for one) where white banner text becomes
  // unreadable. Each theme declares which text color actually stays
  // legible across its whole gradient, rather than assuming white always
  // works - see textShadow in the banner styles for the second layer of
  // insurance against exactly this.
  textColor: "light" | "dark";
};

const THEMES: Record<number, MonthTheme> = {
  1: { name: "January", gradient: ["#6DA9E4", "#8EC5FC", "#B9E1FF"], icon: "snowflake", textColor: "dark" }, // winter blues (light overall)
  2: { name: "February", gradient: ["#FF6B6B", "#FF8FA3", "#FFB6C1"], icon: "heart", textColor: "dark" }, // friendship/valentine pinks-reds
  3: { name: "March", gradient: ["#3FB77E", "#6FCF97", "#A8E6B0"], icon: "shamrock", textColor: "dark" }, // spring greens
  4: { name: "April", gradient: ["#7EC8E3", "#A0D8EF", "#C9E4F6" ], icon: "umbrella", textColor: "dark" }, // spring showers
  5: { name: "May", gradient: ["#F49AC2", "#FFD1DC", "#FFF3B0"], icon: "flower", textColor: "dark" }, // flowers blooming
  6: { name: "June", gradient: ["#FFC93C", "#FFDD67", "#FFEDA0"], icon: "sun", textColor: "dark" }, // sunny start of summer
  7: { name: "July", gradient: ["#EF5350", "#C9CFE8", "#5C6BC0"], icon: "firework", textColor: "light" }, // patriotic - saturated red/indigo ends need light text; white softened in the middle so it isn't invisible there either
  8: { name: "August", gradient: ["#F4A300", "#FFC857", "#FFE29A"], icon: "sun", textColor: "dark" }, // late summer gold
  9: { name: "September", gradient: ["#D97B29", "#E8A33D", "#F2C572"], icon: "leaf", textColor: "dark" }, // early fall
  10: { name: "October", gradient: ["#E4572E", "#F2A65A", "#FFD97D"], icon: "pumpkin", textColor: "dark" }, // pumpkin oranges
  11: { name: "November", gradient: ["#A9642F", "#C98A4B", "#E3B778"], icon: "acorn", textColor: "light" }, // harvest browns are medium-dark throughout
  12: { name: "December", gradient: ["#3A6B5C", "#C0392B", "#E8B84B"], icon: "tree", textColor: "light" }, // evergreen/winter-holiday - all saturated/dark tones
};

export function getMonthlyTheme(date: Date = new Date()): MonthTheme {
  return THEMES[date.getMonth() + 1];
}
