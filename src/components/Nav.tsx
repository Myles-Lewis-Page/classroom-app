import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/roster", label: "Roster & Attendance" },
  { href: "/behavior", label: "Behavior Log" },
  { href: "/homework", label: "Homework" },
  { href: "/groups", label: "Group Builder" },
  { href: "/seating", label: "Seating Chart" },
  { href: "/events", label: "Events" },
  { href: "/math", label: "Math" },
  { href: "/literacy", label: "Reading & Writing" },
  { href: "/reports", label: "Weekly Report" },
  { href: "/sub-mode", label: "Sub Mode" },
];

export default async function Nav() {
  const session = await auth();
  if (!session?.user) return null; // hide nav entirely on the login page / when logged out

  return (
    <nav className="app-nav">
      <div className="h-1 bg-gradient-to-r from-rose-200 via-amber-200 to-sky-200" />
      <div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto text-sm items-center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-slate-600 hover:text-sky-600">
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <Link href="/profile" className="whitespace-nowrap text-slate-600 hover:text-sky-600">
            Profile
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-slate-500 hover:text-rose-500 whitespace-nowrap">
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
