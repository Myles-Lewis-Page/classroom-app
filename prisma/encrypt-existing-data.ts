// One-time migration: encrypts existing plaintext values for the fields
// listed in src/lib/prisma.ts's FIELD_MAP, in place.
//
// SAFE TO RE-RUN: encryptValue() skips values that are already encrypted,
// so running this twice (or after new rows were added) won't double-
// encrypt anything - it'll just re-save already-encrypted rows unchanged.
//
// HOW IT WORKS: it reads each row through the same encrypting Prisma
// client the app uses, then writes each field back via `update`. Since
// the client's write-side extension encrypts on the way out, this is all
// it takes - no manual crypto calls needed here.
//
// USAGE (run once against production, after taking a Railway backup):
//   npx tsx prisma/encrypt-existing-data.ts
//
// Requires ENCRYPTION_KEY to be set in the environment it's run in.

import { prisma } from "../src/lib/prisma";

async function run() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error("ENCRYPTION_KEY is not set. Aborting.");
    process.exit(1);
  }

  console.log("Starting encryption migration...\n");

  // Student: firstName, lastName
  const students = await prisma.student.findMany({
    select: { id: true, firstName: true, lastName: true },
  });
  for (const s of students) {
    await prisma.student.update({
      where: { id: s.id },
      data: { firstName: s.firstName, lastName: s.lastName },
    });
  }
  console.log(`Student: ${students.length} rows`);

  // Parent: name, phone, email, notes
  const parents = await prisma.parent.findMany({
    select: { id: true, name: true, phone: true, email: true, notes: true },
  });
  for (const p of parents) {
    await prisma.parent.update({
      where: { id: p.id },
      data: { name: p.name, phone: p.phone, email: p.email, notes: p.notes },
    });
  }
  console.log(`Parent: ${parents.length} rows`);

  // IEP: accommodations, goals, caseManager, subSafeSummary, serviceMinutes
  const ieps = await prisma.iEP.findMany({
    select: {
      id: true,
      accommodations: true,
      goals: true,
      caseManager: true,
      subSafeSummary: true,
      serviceMinutes: true,
    },
  });
  for (const i of ieps) {
    await prisma.iEP.update({
      where: { id: i.id },
      data: {
        accommodations: i.accommodations,
        goals: i.goals,
        caseManager: i.caseManager,
        subSafeSummary: i.subSafeSummary,
        serviceMinutes: i.serviceMinutes,
      },
    });
  }
  console.log(`IEP: ${ieps.length} rows`);

  // Allergy: allergen, reaction, notes
  const allergies = await prisma.allergy.findMany({
    select: { id: true, allergen: true, reaction: true, notes: true },
  });
  for (const a of allergies) {
    await prisma.allergy.update({
      where: { id: a.id },
      data: { allergen: a.allergen, reaction: a.reaction, notes: a.notes },
    });
  }
  console.log(`Allergy: ${allergies.length} rows`);

  // DietaryRestriction: restriction, notes
  const diets = await prisma.dietaryRestriction.findMany({
    select: { id: true, restriction: true, notes: true },
  });
  for (const d of diets) {
    await prisma.dietaryRestriction.update({
      where: { id: d.id },
      data: { restriction: d.restriction, notes: d.notes },
    });
  }
  console.log(`DietaryRestriction: ${diets.length} rows`);

  // StudentSupport: notes
  const supports = await prisma.studentSupport.findMany({
    select: { id: true, notes: true },
  });
  for (const s of supports) {
    await prisma.studentSupport.update({
      where: { id: s.id },
      data: { notes: s.notes },
    });
  }
  console.log(`StudentSupport: ${supports.length} rows`);

  // BehaviorNote: note
  const behaviorNotes = await prisma.behaviorNote.findMany({
    select: { id: true, note: true },
  });
  for (const b of behaviorNotes) {
    await prisma.behaviorNote.update({
      where: { id: b.id },
      data: { note: b.note },
    });
  }
  console.log(`BehaviorNote: ${behaviorNotes.length} rows`);

  // BehaviorEntry: comment
  const behaviorEntries = await prisma.behaviorEntry.findMany({
    select: { id: true, comment: true },
  });
  for (const b of behaviorEntries) {
    await prisma.behaviorEntry.update({
      where: { id: b.id },
      data: { comment: b.comment },
    });
  }
  console.log(`BehaviorEntry: ${behaviorEntries.length} rows`);

  // ParentContactLog: comment
  const contactLogs = await prisma.parentContactLog.findMany({
    select: { id: true, comment: true },
  });
  for (const c of contactLogs) {
    await prisma.parentContactLog.update({
      where: { id: c.id },
      data: { comment: c.comment },
    });
  }
  console.log(`ParentContactLog: ${contactLogs.length} rows`);

  // Observation: note
  const observations = await prisma.observation.findMany({
    select: { id: true, note: true },
  });
  for (const o of observations) {
    await prisma.observation.update({
      where: { id: o.id },
      data: { note: o.note },
    });
  }
  console.log(`Observation: ${observations.length} rows`);

  // PraiseNote: note
  const praiseNotes = await prisma.praiseNote.findMany({
    select: { id: true, note: true },
  });
  for (const p of praiseNotes) {
    await prisma.praiseNote.update({
      where: { id: p.id },
      data: { note: p.note },
    });
  }
  console.log(`PraiseNote: ${praiseNotes.length} rows`);

  // ChaperoneInterest: studentName, parentName, contactInfo, note
  const interests = await prisma.chaperoneInterest.findMany({
    select: { id: true, studentName: true, parentName: true, contactInfo: true, note: true },
  });
  for (const c of interests) {
    await prisma.chaperoneInterest.update({
      where: { id: c.id },
      data: {
        studentName: c.studentName,
        parentName: c.parentName,
        contactInfo: c.contactInfo,
        note: c.note,
      },
    });
  }
  console.log(`ChaperoneInterest: ${interests.length} rows`);

  // EventChaperone: parentName
  const chaperones = await prisma.eventChaperone.findMany({
    select: { id: true, parentName: true },
  });
  for (const c of chaperones) {
    await prisma.eventChaperone.update({
      where: { id: c.id },
      data: { parentName: c.parentName },
    });
  }
  console.log(`EventChaperone: ${chaperones.length} rows`);

  // Relationship: notes
  const relationships = await prisma.relationship.findMany({
    select: { id: true, notes: true },
  });
  for (const r of relationships) {
    await prisma.relationship.update({
      where: { id: r.id },
      data: { notes: r.notes },
    });
  }
  console.log(`Relationship: ${relationships.length} rows`);

  console.log("\nDone. All sensitive fields are now encrypted at rest.");
}

run()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
