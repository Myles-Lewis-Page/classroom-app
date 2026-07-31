// Simple, single-color line-art icons for the monthly newsletter banner.
// Kept deliberately plain/geometric (not photo-realistic, no emoji glyphs
// per house style) and strictly secular - see src/lib/monthlyTheme.ts for
// why. Each is a small self-contained <svg>, sized via the `size` prop,
// colored via `color` (defaults to white, since these sit on a colored
// banner background).
export function SeasonalIcon({
  icon,
  size = 28,
  color = "#FFFFFF",
  className = "",
}: {
  icon: "snowflake" | "heart" | "shamrock" | "umbrella" | "flower" | "sun" | "leaf" | "pumpkin" | "acorn" | "tree" | "snowman" | "firework";
  size?: number;
  color?: string;
  className?: string;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", className, "aria-hidden": true };

  switch (icon) {
    case "snowflake":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2v20M4.5 6.5l15 11M4.5 17.5l15-11" />
          <path d="M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2" />
          <path d="M4.5 6.5l2.7.5M4.5 6.5l.5-2.7M19.5 17.5l-2.7-.5M19.5 17.5l-.5 2.7" />
          <path d="M19.5 6.5l-2.7.5M19.5 6.5l-.5-2.7M4.5 17.5l2.7-.5M4.5 17.5l.5 2.7" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} fill={color}>
          <path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 2 5 5.6 5c2 0 3.3 1 4.4 2.5C11.1 6 12.4 5 14.4 5 18 5 19.7 8.6 22 11.7 19.5 16.1 12 21 12 21z" />
        </svg>
      );
    case "shamrock":
      return (
        <svg {...common} fill={color}>
          <circle cx="9" cy="9" r="4" />
          <circle cx="15" cy="9" r="4" />
          <circle cx="12" cy="14" r="4" />
          <rect x="11" y="16" width="2" height="6" rx="1" />
        </svg>
      );
    case "umbrella":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 11a10 10 0 0 1 20 0z" fill={color} stroke="none" />
          <path d="M12 11v9a2 2 0 0 1-2 2" />
          <path d="M12 2v2" />
        </svg>
      );
    case "flower":
      return (
        <svg {...common} fill={color}>
          <circle cx="12" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="12" r="3" />
          <circle cx="12" cy="12" r="2.5" fill="#F4A300" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" fill={color} stroke="none" />
          <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common} fill={color}>
          <path d="M20 4C10 4 4 10 4 18v2h2c8 0 14-6 14-16z" />
        </svg>
      );
    case "pumpkin":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5">
          <rect x="11" y="2" width="2" height="3" rx="1" fill={color} stroke="none" />
          <ellipse cx="12" cy="14" rx="8" ry="7" fill={color} stroke="none" />
          <path d="M8 8v13M12 7v14M16 8v13" stroke="#00000022" />
        </svg>
      );
    case "acorn":
      return (
        <svg {...common} fill={color}>
          <path d="M12 22c3 0 5-3 5-7s-2-5-5-5-5 1-5 5 2 7 5 7z" />
          <path d="M7 9c0-3 2-6 5-6s5 3 5 6c-2-1.5-8-1.5-10 0z" />
        </svg>
      );
    case "tree":
      return (
        <svg {...common} fill={color}>
          <path d="M12 2 7 9h2l-3.5 5H8L4 20h16l-4-6h2.5L15 9h2z" />
          <rect x="11" y="20" width="2" height="2" />
        </svg>
      );
    case "snowman":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="12" cy="6" r="3" fill={color} stroke="none" />
          <circle cx="12" cy="14" r="4.5" fill={color} stroke="none" />
          <circle cx="10.7" cy="5.5" r="0.4" fill="#333" stroke="none" />
          <circle cx="13.3" cy="5.5" r="0.4" fill="#333" stroke="none" />
          <circle cx="10.5" cy="13" r="0.4" fill="#333" stroke="none" />
          <circle cx="13.5" cy="13" r="0.4" fill="#333" stroke="none" />
          <circle cx="10.5" cy="15" r="0.4" fill="#333" stroke="none" />
          <circle cx="13.5" cy="15" r="0.4" fill="#333" stroke="none" />
        </svg>
      );
    case "firework":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 3v6M12 3l-1.5 2M12 3l1.5 2" />
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill={color} stroke="none" />
          <path d="M12 15v6M6 12H3M21 12h-3M7.8 7.8 5.6 5.6M18.4 18.4l-2.2-2.2M7.8 16.2l-2.2 2.2M18.4 5.6l-2.2 2.2" />
        </svg>
      );
    default:
      return null;
  }
}
