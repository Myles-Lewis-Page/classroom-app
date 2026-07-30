import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePrincipal, getPrincipalOwnedTeacher } from "@/lib/roleScope";
import { generateTempPassword } from "@/lib/tempPassword";

// POST - generates a fresh temporary password for this Teacher (lost/forgot
// theirs, same flow as first provisioning them), returned once to relay.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const principalId = await requirePrincipal();
  if (!principalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const teacher = await getPrincipalOwnedTeacher(principalId, id);
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.teacher.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });

  return NextResponse.json({ tempPassword });
}
