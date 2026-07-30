import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Role = "admin" | "principal" | "teacher";

/** Returns the logged-in user's role and id, or null if not authenticated. */
export async function getSessionUser(): Promise<{ id: string; role: Role } | null> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role } | undefined;
  if (!user?.id || !user?.role) return null;
  return { id: user.id, role: user.role };
}

/** Confirms the logged-in user is an Admin, returning their id, or null otherwise. */
export async function requireAdmin(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user.id : null;
}

/** Confirms the logged-in user is a Principal, returning their id, or null otherwise. */
export async function requirePrincipal(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.role === "principal" ? user.id : null;
}

/** Confirms a given Teacher actually belongs to this Principal's School, before allowing any read/write on them. */
export async function getPrincipalOwnedTeacher(principalId: string, teacherId: string) {
  const principal = await prisma.principal.findUnique({ where: { id: principalId } });
  if (!principal) return null;
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.schoolId !== principal.schoolId) return null;
  return teacher;
}
