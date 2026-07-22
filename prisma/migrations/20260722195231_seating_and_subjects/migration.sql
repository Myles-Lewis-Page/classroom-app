-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "seatingCols" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "seatingRows" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "SkillSubject" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ExtraSeat" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtraSeat_classroomId_row_col_key" ON "ExtraSeat"("classroomId", "row", "col");

-- AddForeignKey
ALTER TABLE "ExtraSeat" ADD CONSTRAINT "ExtraSeat_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

