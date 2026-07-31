-- DropForeignKey
ALTER TABLE "ChaperoneInterest" DROP CONSTRAINT "ChaperoneInterest_studentId_fkey";

-- AlterTable: add studentName as nullable first, then backfill, then
-- enforce NOT NULL - any pre-existing ChaperoneInterest rows (created
-- before this privacy fix, when studentId was required) get their
-- studentName backfilled from the linked Student's name so no row is left
-- with missing data.
ALTER TABLE "ChaperoneInterest" ADD COLUMN "studentName" TEXT;

UPDATE "ChaperoneInterest" ci
SET "studentName" = TRIM(CONCAT(s."firstName", ' ', s."lastName"))
FROM "Student" s
WHERE ci."studentId" = s."id" AND ci."studentName" IS NULL;

-- Safety net: any row that still has no studentName (orphaned studentId,
-- if that were ever possible) gets a placeholder rather than blocking the
-- migration - this should be a no-op in practice since studentId was
-- previously required and FK-enforced.
UPDATE "ChaperoneInterest" SET "studentName" = '(unknown)' WHERE "studentName" IS NULL;

ALTER TABLE "ChaperoneInterest" ALTER COLUMN "studentName" SET NOT NULL;
ALTER TABLE "ChaperoneInterest" ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChaperoneInterest" ADD CONSTRAINT "ChaperoneInterest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
