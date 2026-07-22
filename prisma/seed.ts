import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  const teacher = await prisma.teacher.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      name: "Teacher",
      email: "teacher@example.com",
      passwordHash,
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
  console.log("Login: teacher@example.com / changeme123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
