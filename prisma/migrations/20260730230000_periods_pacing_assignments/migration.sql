-- AlterTable
ALTER TABLE "ScheduleBlock" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "handedOut" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pacingTopicId" TEXT,
ADD COLUMN     "pacingUnitId" TEXT;

-- CreateTable
CREATE TABLE "_AssignmentSections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignmentSections_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AssignmentSections_B_index" ON "_AssignmentSections"("B");

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_pacingUnitId_fkey" FOREIGN KEY ("pacingUnitId") REFERENCES "PacingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_pacingTopicId_fkey" FOREIGN KEY ("pacingTopicId") REFERENCES "UnitTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignmentSections" ADD CONSTRAINT "_AssignmentSections_A_fkey" FOREIGN KEY ("A") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignmentSections" ADD CONSTRAINT "_AssignmentSections_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

