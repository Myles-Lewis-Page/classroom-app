-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "gradeCategoryId" TEXT;

-- CreateTable
CREATE TABLE "GradeCategory" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradeCategory_classroomId_name_key" ON "GradeCategory"("classroomId", "name");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_gradeCategoryId_fkey" FOREIGN KEY ("gradeCategoryId") REFERENCES "GradeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeCategory" ADD CONSTRAINT "GradeCategory_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill default grade categories for existing classrooms so Gradebook
-- has something sensible right away: Classwork 20%, Homework 30%, Tests 50%.
INSERT INTO "GradeCategory" (id, "classroomId", name, weight, "order")
SELECT substr(md5(random()::text || clock_timestamp()::text || c.id || '1'), 1, 25), c.id, 'Classwork', 20, 0
FROM "Classroom" c
ON CONFLICT ("classroomId", name) DO NOTHING;

INSERT INTO "GradeCategory" (id, "classroomId", name, weight, "order")
SELECT substr(md5(random()::text || clock_timestamp()::text || c.id || '2'), 1, 25), c.id, 'Homework', 30, 1
FROM "Classroom" c
ON CONFLICT ("classroomId", name) DO NOTHING;

INSERT INTO "GradeCategory" (id, "classroomId", name, weight, "order")
SELECT substr(md5(random()::text || clock_timestamp()::text || c.id || '3'), 1, 25), c.id, 'Tests', 50, 2
FROM "Classroom" c
ON CONFLICT ("classroomId", name) DO NOTHING;
