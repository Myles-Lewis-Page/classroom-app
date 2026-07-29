-- DropIndex
DROP INDEX "PacingUnitDay_pacingUnitId_date_key";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "PacingUnitDay" ADD COLUMN     "dayNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isExtraDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "topicId" TEXT;

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitSummative" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitSummative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitTopic" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "learningTarget" TEXT,
    "standards" TEXT,
    "support" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Section_classroomId_name_key" ON "Section"("classroomId", "name");

-- Data migration: existing PacingUnitDay rows all got dayNumber=0 from the
-- column default above. Backfill a real sequential dayNumber per unit
-- (ordered by date, matching how they were originally generated) before the
-- unique constraint below is created, or units with more than one day would
-- violate it immediately.
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "pacingUnitId" ORDER BY "date" ASC) AS rn
  FROM "PacingUnitDay"
)
UPDATE "PacingUnitDay" AS d
SET "dayNumber" = numbered.rn
FROM numbered
WHERE d."id" = numbered."id";

-- CreateIndex
CREATE UNIQUE INDEX "PacingUnitDay_pacingUnitId_dayNumber_key" ON "PacingUnitDay"("pacingUnitId", "dayNumber");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitSummative" ADD CONSTRAINT "UnitSummative_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "PacingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTopic" ADD CONSTRAINT "UnitTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "PacingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacingUnitDay" ADD CONSTRAINT "PacingUnitDay_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "UnitTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

