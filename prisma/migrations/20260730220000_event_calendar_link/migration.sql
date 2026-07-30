-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "calendarEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_calendarEventId_key" ON "Event"("calendarEventId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

