-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "activeClassroomId" TEXT;

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "schoolName" TEXT;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_activeClassroomId_fkey" FOREIGN KEY ("activeClassroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: set each teacher's activeClassroomId to their most recently
-- created non-archived classroom, so existing accounts keep working exactly
-- as before without any visible change.
UPDATE "Teacher" t
SET "activeClassroomId" = (
  SELECT c.id FROM "Classroom" c
  WHERE c."teacherId" = t.id AND c."isArchived" = false
  ORDER BY c."createdAt" DESC
  LIMIT 1
)
WHERE t."activeClassroomId" IS NULL;
