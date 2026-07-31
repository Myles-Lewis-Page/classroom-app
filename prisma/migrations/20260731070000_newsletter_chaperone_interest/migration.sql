-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "newsletterContent" TEXT;

-- CreateTable
CREATE TABLE "ChaperoneInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaperoneInterest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChaperoneInterest" ADD CONSTRAINT "ChaperoneInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaperoneInterest" ADD CONSTRAINT "ChaperoneInterest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

