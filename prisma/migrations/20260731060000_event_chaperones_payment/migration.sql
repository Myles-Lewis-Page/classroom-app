-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "chaperonesNeeded" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "EventStatus" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventChaperone" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChaperone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventChaperone_eventId_studentId_key" ON "EventChaperone"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "EventChaperone" ADD CONSTRAINT "EventChaperone_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChaperone" ADD CONSTRAINT "EventChaperone_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

