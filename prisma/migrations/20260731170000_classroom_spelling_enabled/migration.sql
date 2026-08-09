-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "spellingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any classroom that already has an active "Spelling" Skill
-- Subject (from before this feature existed) gets spellingEnabled turned
-- on, so the nav link doesn't just disappear on her for something she was
-- actively using. The old SkillSubject row itself gets deactivated (not
-- deleted - preserves any rated history) since Spelling is no longer
-- meant to live in the generic Skills feature at all.
UPDATE "Classroom" c
SET "spellingEnabled" = true
WHERE EXISTS (
  SELECT 1 FROM "SkillSubject" ss
  WHERE ss."classroomId" = c.id AND ss."name" = 'Spelling' AND ss."isActive" = true
);

UPDATE "SkillSubject"
SET "isActive" = false
WHERE "name" = 'Spelling' AND "isActive" = true;
