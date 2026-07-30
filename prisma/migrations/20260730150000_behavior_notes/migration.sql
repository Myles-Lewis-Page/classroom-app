-- CreateTable
CREATE TABLE "BehaviorNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "note" TEXT,
    "subjectId" TEXT,
    "contactLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BehaviorNote_contactLogId_key" ON "BehaviorNote"("contactLogId");

-- AddForeignKey
ALTER TABLE "BehaviorNote" ADD CONSTRAINT "BehaviorNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorNote" ADD CONSTRAINT "BehaviorNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorNote" ADD CONSTRAINT "BehaviorNote_contactLogId_fkey" FOREIGN KEY ("contactLogId") REFERENCES "ParentContactLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

