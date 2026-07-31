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
};

const THEMES: Record<number, MonthTheme> = {
  1: { name: "January", gradient: ["#6DA9E4", "#8EC5FC", "#B9E1FF"], icon: "snowflake" }, // winter blues
  2: { name: "February", gradient: ["#FF6B6B", "#FF8FA3", "#FFB6C1"], icon: "heart" }, // friendship/valentine pinks-reds
  3: { name: "March", gradient: ["#3FB77E", "#6FCF97", "#A8E6B0"], icon: "shamrock" }, // spring greens
  4: { name: "April", gradient: ["#7EC8E3", "#A0D8EF", "#C9E4F6" ], icon: "umbrella" }, // spring showers
  5: { name: "May", gradient: ["#F49AC2", "#FFD1DC", "#FFF3B0"], icon: "flower" }, // flowers blooming
  6: { name: "June", gradient: ["#FFC93C", "#FFDD67", "#FFEDA0"], icon: "sun" }, // sunny start of summer
  7: { name: "July", gradient: ["#EF5350", "#FFFFFF", "#5C6BC0"], icon: "firework" }, // patriotic red-white-blue
  8: { name: "August", gradient: ["#F4A300", "#FFC857", "#FFE29A"], icon: "sun" }, // late summer gold
  9: { name: "September", gradient: ["#D97B29", "#E8A33D", "#F2C572"], icon: "leaf" }, // early fall
  10: { name: "October", gradient: ["#E4572E", "#F2A65A", "#FFD97D"], icon: "pumpkin" }, // pumpkin oranges
  11: { name: "November", gradient: ["#A9642F", "#C98A4B", "#E3B778"], icon: "acorn" }, // harvest browns
  12: { name: "December", gradient: ["#3A6B5C", "#C0392B", "#E8B84B"], icon: "tree" }, // evergreen/winter-holiday
};

export function getMonthlyTheme(date: Date = new Date()): MonthTheme {
  return THEMES[date.getMonth() + 1];
}
