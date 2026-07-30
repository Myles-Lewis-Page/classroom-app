import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import PeriodSwitcher from "@/components/PeriodSwitcher";
import SectionSwitcher from "@/components/SectionSwitcher";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/roster", label: "Roster & Attendance" },
  { href: "/behavior", label: "Behavior & Contact Log" },
  { href: "/homework", label: "Assignments" },
  { href: "/gradebook", label: "Gradebook" },
  { href: "/pacing-guide", label: "Pacing Guide" },
  { href: "/school-calendar", label: "School Calendar" },
  { href: "/schedule", label: "Daily Schedule" },
  { href: "/groups", label: "Group Builder" },
  { href: "/seating", label: "Seating Chart" },
  { href: "/events", label: "Events" },
  { href: "/skills", label: "Skills" },
  { href: "/reports", label: "Weekly Report" },
  { href: "/sub-mode", label: "Sub Mode" },
];

export default async function Nav() {
  const session = await auth();
  if (!session?.user) return null; // hide nav entirely on the login page / when logged out

  const teacherId = (session.user as { id?: string })?.id;
  const classroomId = await getCurrentClassroomId();
  const [classroom, allClassrooms] = await Promise.all([
    classroomId
      ? prisma.classroom.findUnique({
          where: { id: classroomId },
          select: { name: true, schoolName: true, schoolYear: true },
        })
      : null,
    teacherId
      ? prisma.classroom.findMany({
          where: { teacherId, isArchived: false },
          select: { id: true, name: true, isArchived: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  return (
    <nav className="app-nav">
      <div className="h-1 bg-gradient-to-r from-rose-200 via-amber-200 to-sky-200" />

      {/* Top identity bar - shows on every page, never scrolls, so the app
          name, classroom, Profile, and Logout are always visible regardless
          of how many page links are in the row below or how narrow the
          window is. */}
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-violet-100">
        <Link href="/dashboard" className="font-bold text-slate-700 whitespace-nowrap">
          🍎 Classroom App
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          {classroom ? (
            <Link
              href="/profile"
              className="text-sm text-slate-600 hover:text-sky-600 whitespace-nowrap"
              title="Go to Profile"
            >
              {classroom.name}
              {classroom.schoolName ? ` · ${classroom.schoolName}` : ""}{" "}
              <span className="text-slate-400">· {classroom.schoolYear}</span>
            </Link>
          ) : (
            <Link href="/profile" className="text-sm text-rose-600 hover:underline whitespace-nowrap">
              Set up your classroom →
            </Link>
          )}
          {classroomId && (
            <PeriodSwitcher classrooms={allClassrooms} currentId={classroomId} />
          )}
          <SectionSwitcher />
          <Link href="/profile" className="text-sm whitespace-nowrap text-slate-600 hover:text-sky-600">
            Profile
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-rose-500 whitespace-nowrap"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* Page links - wraps to multiple lines on narrow screens instead of
          scrolling horizontally, so nothing is ever hidden off-screen. */}
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap gap-x-4 gap-y-2 text-sm items-center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-slate-600 hover:text-sky-600">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
