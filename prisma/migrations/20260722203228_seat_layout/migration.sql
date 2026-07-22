-- DropForeignKey
ALTER TABLE "ExtraSeat" DROP CONSTRAINT "ExtraSeat_classroomId_fkey";

-- AlterTable
ALTER TABLE "Classroom" ALTER COLUMN "seatingRows" SET DEFAULT 8,
ALTER COLUMN "seatingCols" SET DEFAULT 10;

-- DropTable
DROP TABLE "ExtraSeat";

-- CreateTable
CREATE TABLE "SeatSlot" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatSlot_classroomId_row_col_key" ON "SeatSlot"("classroomId", "row", "col");

-- AddForeignKey
ALTER TABLE "SeatSlot" ADD CONSTRAINT "SeatSlot_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: give every existing classroom a plain rectangular grid of seat
-- slots matching its previous seatingRows x seatingCols, so nobody's current
-- layout disappears. They can customize freely afterward via the new
-- Seating Layout editor.
INSERT INTO "SeatSlot" (id, "classroomId", "row", "col")
SELECT
  substr(md5(random()::text || clock_timestamp()::text || r::text || co::text), 1, 25),
  c.id,
  r,
  co
FROM "Classroom" c
CROSS JOIN generate_series(0, GREATEST(c."seatingRows" - 1, 0)) AS r
CROSS JOIN generate_series(0, GREATEST(c."seatingCols" - 1, 0)) AS co
ON CONFLICT ("classroomId", "row", "col") DO NOTHING;
