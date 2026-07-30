-- CreateTable
CREATE TABLE "PeriodExtraDay" (
    "id" TEXT NOT NULL,
    "pacingUnitId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "spilledFromDayId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT,
    "learningTarget" TEXT,
    "standards" TEXT,
    "supports" TEXT,
    "lessonActivities" TEXT,
    "warmUp" TEXT,
    "materialsNeeded" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodExtraDay_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PeriodExtraDay" ADD CONSTRAINT "PeriodExtraDay_pacingUnitId_fkey" FOREIGN KEY ("pacingUnitId") REFERENCES "PacingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodExtraDay" ADD CONSTRAINT "PeriodExtraDay_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

