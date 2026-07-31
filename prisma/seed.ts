import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTempPassword } from "../src/lib/tempPassword";

const prisma = new PrismaClient();

async function main() {
  // This used to be a fixed, documented password ("changeme123") - fine
  // for a truly local-only demo, but this repo is public, so that string
  // was effectively a published credential for anyone who found the repo
  // and guessed (or read the README to learn) it was the first teacher
  // login. Generated fresh per seed run instead, printed once to the
  // console/deploy logs, and the account is forced to change it on first
  // login - same pattern as every other system-generated password in this
  // app (see src/lib/tempPassword.ts).
  //
  // upsert-by-email means this only ever sets the password on first
  // creation - re-running the seed against an already-seeded database
  // (e.g. SEED_ON_BOOT left on by accident) does NOT reset an existing
  // teacher's password, so this can't be used to silently take over an
  // account that's already had its password changed.
  const existing = await prisma.teacher.findUnique({ where: { email: "teacher@example.com" } });
  const tempPassword = existing ? null : generateTempPassword();
  const passwordHash = tempPassword
    ? await bcrypt.hash(tempPassword, 12)
    : existing!.passwordHash;

  const teacher = await prisma.teacher.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      name: "Teacher",
      email: "teacher@example.com",
      passwordHash,
      mustChangePassword: true,
    },
  });

  const classroom = await prisma.classroom.create({
    data: {
      teacherId: teacher.id,
      name: "My Classroom",
      schoolYear: "2026-2027",
    },
  });

  // Default daily subjects/schedule - editable later via Schedule Builder
  const defaultSubjects = [
    "Arrival",
    "Breakfast",
    "Math",
    "Reading",
    "Recess",
    "Writing",
    "Science",
  ];
  for (let i = 0; i < defaultSubjects.length; i++) {
    await prisma.subject.create({
      data: {
        classroomId: classroom.id,
        name: defaultSubjects[i],
        order: i,
      },
    });
  }

  // Default "Math" subject with standard skills: multiplication tables 0-12,
  // addition/subtraction types, division facts.
  const mathSubject = await prisma.skillSubject.create({
    data: { classroomId: classroom.id, name: "Math", order: 0 },
  });

  let order = 0;
  for (let i = 0; i <= 12; i++) {
    await prisma.skill.create({
      data: {
        skillSubjectId: mathSubject.id,
        category: "multiplication",
        skillName: `${i}s`,
        order: order++,
      },
    });
  }
  const addSubTypes = ["single + single", "double + single", "double + double"];
  for (const t of addSubTypes) {
    await prisma.skill.create({
      data: { skillSubjectId: mathSubject.id, category: "addition", skillName: t, order: order++ },
    });
  }
  for (const t of addSubTypes.map((t) => t.replace("+", "-"))) {
    await prisma.skill.create({
      data: {
        skillSubjectId: mathSubject.id,
        category: "subtraction",
        skillName: t,
        order: order++,
      },
    });
  }
  for (let i = 0; i <= 12; i++) {
    await prisma.skill.create({
      data: {
        skillSubjectId: mathSubject.id,
        category: "division",
        skillName: `divide by ${i}`,
        order: order++,
      },
    });
  }

  // Reading and Writing subjects start empty - teacher fills in skills as
  // they decide what to track, same pattern as before.
  await prisma.skillSubject.create({
    data: { classroomId: classroom.id, name: "Reading", order: 1 },
  });
  await prisma.skillSubject.create({
    data: { classroomId: classroom.id, name: "Writing", order: 2 },
  });

  // Default tags
  const defaultTags = ["IEP", "504", "ELL", "Needs Reading Support"];
  for (const name of defaultTags) {
    await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("Seed complete.");
  if (tempPassword) {
    console.log(`Login: teacher@example.com / ${tempPassword}`);
    console.log("(This account must change its password on first login.)");
  } else {
    console.log("teacher@example.com already existed - its password was left untouched.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
