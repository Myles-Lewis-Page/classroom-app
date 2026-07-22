-- AlterTable
ALTER TABLE "ParentContactLog" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'phone';


-- Convert existing skill statuses from the old 3-state system
-- (not_started/practicing/mastered) to the new 0-5 rating scale.
-- 0 = not started, 3 = midway (was "practicing"), 5 = fully mastered.
UPDATE "StudentSkillStatus"
SET status = CASE status
  WHEN 'not_started' THEN '0'
  WHEN 'practicing' THEN '3'
  WHEN 'mastered' THEN '5'
  ELSE status
END
WHERE status IN ('not_started', 'practicing', 'mastered');

-- Update default for new skill status rows going forward (0-5 scale)
ALTER TABLE "StudentSkillStatus" ALTER COLUMN "status" SET DEFAULT '0';
