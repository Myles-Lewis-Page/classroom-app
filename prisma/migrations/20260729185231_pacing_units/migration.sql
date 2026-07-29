-- CreateTable
CREATE TABLE "PacingUnit" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "standards" TEXT,
    "topics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacingUnitDay" (
    "id" TEXT NOT NULL,
    "pacingUnitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT,
    "learningTarget" TEXT,
    "standards" TEXT,
    "supports" TEXT,
    "lessonActivities" TEXT,
    "warmUp" TEXT,
    "materialsNeeded" TEXT,

    CONSTRAINT "PacingUnitDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacingUnitDay_pacingUnitId_date_key" ON "PacingUnitDay"("pacingUnitId", "date");

-- AddForeignKey
ALTER TABLE "PacingUnit" ADD CONSTRAINT "PacingUnit_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacingUnitDay" ADD CONSTRAINT "PacingUnitDay_pacingUnitId_fkey" FOREIGN KEY ("pacingUnitId") REFERENCES "PacingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

