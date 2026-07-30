-- CreateTable
CREATE TABLE "PeriodPacingOffset" (
    "id" TEXT NOT NULL,
    "pacingUnitId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodPacingOffset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeriodPacingOffset_pacingUnitId_sectionId_key" ON "PeriodPacingOffset"("pacingUnitId", "sectionId");

-- AddForeignKey
ALTER TABLE "PeriodPacingOffset" ADD CONSTRAINT "PeriodPacingOffset_pacingUnitId_fkey" FOREIGN KEY ("pacingUnitId") REFERENCES "PacingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodPacingOffset" ADD CONSTRAINT "PeriodPacingOffset_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

