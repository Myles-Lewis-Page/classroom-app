import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Resets the password for a specific teacher account back to a known value.
// Controlled by env vars so it can be triggered safely from the Railway
// dashboard without needing CLI access:
//   RESET_PASSWORD_EMAIL - which account to reset (required)
//   RESET_PASSWORD_TO    - the new password to set (required)

async function main() {
  const email = process.env.RESET_PASSWORD_EMAIL?.trim();
  const newPassword = process.env.RESET_PASSWORD_TO?.trim();

  if (!email || !newPassword) {
    console.error(
      "RESET_PASSWORD_EMAIL and RESET_PASSWORD_TO must both be set - skipping reset."
    );
    process.exit(1);
  }

  const teacher = await prisma.teacher.findUnique({ where: { email } });
  if (!teacher) {
    console.error(`No teacher found with email ${email} - nothing reset.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.teacher.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Password reset complete for ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
