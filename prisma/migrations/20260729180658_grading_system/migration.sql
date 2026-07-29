-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "gradingType" TEXT NOT NULL DEFAULT 'completion',
ADD COLUMN     "maxPoints" INTEGER;

-- AlterTable
ALTER TABLE "HomeworkEntry" ADD COLUMN     "gradeScore" INTEGER,
ADD COLUMN     "gradeStatus" TEXT;


-- Migrate old combined status values into the new split system:
-- "status" is now submission-only (missing/handed_in); grading moves to the
-- new gradeStatus column.
UPDATE "HomeworkEntry"
SET "gradeStatus" = 'complete', "status" = 'handed_in'
WHERE "status" = 'complete';

UPDATE "HomeworkEntry"
SET "gradeStatus" = 'incomplete', "status" = 'handed_in'
WHERE "status" IN ('incomplete', 'needs_help');
