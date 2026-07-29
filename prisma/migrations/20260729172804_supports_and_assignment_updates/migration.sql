-- AlterTable
-- Rename "date" to "assignedDate" (preserves existing assignment dates,
-- rather than dropping and re-adding which would wipe them).
ALTER TABLE "Assignment" RENAME COLUMN "date" TO "assignedDate";
ALTER TABLE "Assignment" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "skillSubjectId" TEXT;

-- AlterTable
ALTER TABLE "ParentContactLog" ADD COLUMN     "followUp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SupportType" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportOption" (
    "id" TEXT NOT NULL,
    "supportTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupportOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supportTypeId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportType_classroomId_name_key" ON "SupportType"("classroomId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSupport_studentId_supportTypeId_key" ON "StudentSupport"("studentId", "supportTypeId");

-- AddForeignKey
ALTER TABLE "SupportType" ADD CONSTRAINT "SupportType_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportOption" ADD CONSTRAINT "SupportOption_supportTypeId_fkey" FOREIGN KEY ("supportTypeId") REFERENCES "SupportType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupport" ADD CONSTRAINT "StudentSupport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupport" ADD CONSTRAINT "StudentSupport_supportTypeId_fkey" FOREIGN KEY ("supportTypeId") REFERENCES "SupportType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupport" ADD CONSTRAINT "StudentSupport_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_skillSubjectId_fkey" FOREIGN KEY ("skillSubjectId") REFERENCES "SkillSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

