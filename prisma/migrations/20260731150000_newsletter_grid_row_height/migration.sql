-- AlterTable
ALTER TABLE "NewsletterBlock" ADD COLUMN     "height" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "row" INTEGER NOT NULL DEFAULT 1;

-- Backfill: every existing block currently defaults to row=1, which would
-- make them all collide under the new explicit-row placement system (they
-- previously relied on CSS auto-flow to avoid visually overlapping, with
-- no real row tracked at all). Give each block within the same newsletter
-- a distinct row based on its existing reading order, so nothing overlaps
-- the moment this ships - she can still rearrange from there.
UPDATE "NewsletterBlock" nb
SET "row" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "newsletterId" ORDER BY "order") AS rn
  FROM "NewsletterBlock"
) sub
WHERE nb."id" = sub."id";

-- AlterTable
ALTER TABLE "NewsletterTemplateBlock" ADD COLUMN     "height" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "row" INTEGER NOT NULL DEFAULT 1;

UPDATE "NewsletterTemplateBlock" ntb
SET "row" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "templateId" ORDER BY "order") AS rn
  FROM "NewsletterTemplateBlock"
) sub
WHERE ntb."id" = sub."id";
