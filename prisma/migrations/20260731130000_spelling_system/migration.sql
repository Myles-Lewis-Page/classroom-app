-- CreateTable
CREATE TABLE "SpellingList" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpellingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellingWord" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SpellingWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellingTestDay" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpellingTestDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellingResult" (
    "id" TEXT NOT NULL,
    "testDayId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,

    CONSTRAINT "SpellingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpellingList_classroomId_weekOf_idx" ON "SpellingList"("classroomId", "weekOf");

-- CreateIndex
CREATE INDEX "SpellingTestDay_listId_date_idx" ON "SpellingTestDay"("listId", "date");

-- CreateIndex
CREATE INDEX "SpellingResult_studentId_idx" ON "SpellingResult"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellingResult_testDayId_wordId_studentId_key" ON "SpellingResult"("testDayId", "wordId", "studentId");

-- AddForeignKey
ALTER TABLE "SpellingList" ADD CONSTRAINT "SpellingList_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellingWord" ADD CONSTRAINT "SpellingWord_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SpellingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellingTestDay" ADD CONSTRAINT "SpellingTestDay_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SpellingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellingResult" ADD CONSTRAINT "SpellingResult_testDayId_fkey" FOREIGN KEY ("testDayId") REFERENCES "SpellingTestDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellingResult" ADD CONSTRAINT "SpellingResult_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "SpellingWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellingResult" ADD CONSTRAINT "SpellingResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

