-- CreateTable
CREATE TABLE "PacingUnitDayPeriod" (
    "id" TEXT NOT NULL,
    "pacingUnitDayId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacingUnitDayPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacingUnitDayPeriod_pacingUnitDayId_sectionId_key" ON "PacingUnitDayPeriod"("pacingUnitDayId", "sectionId");

-- AddForeignKey
ALTER TABLE "PacingUnitDayPeriod" ADD CONSTRAINT "PacingUnitDayPeriod_pacingUnitDayId_fkey" FOREIGN KEY ("pacingUnitDayId") REFERENCES "PacingUnitDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacingUnitDayPeriod" ADD CONSTRAINT "PacingUnitDayPeriod_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

