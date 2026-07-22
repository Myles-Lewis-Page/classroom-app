-- DropForeignKey
ALTER TABLE "MathSkill" DROP CONSTRAINT "MathSkill_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "StudentMathStatus" DROP CONSTRAINT "StudentMathStatus_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentMathStatus" DROP CONSTRAINT "StudentMathStatus_mathSkillId_fkey";

-- DropForeignKey
ALTER TABLE "LiteracySkill" DROP CONSTRAINT "LiteracySkill_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "StudentLiteracyStatus" DROP CONSTRAINT "StudentLiteracyStatus_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentLiteracyStatus" DROP CONSTRAINT "StudentLiteracyStatus_literacySkillId_fkey";

-- DropTable
DROP TABLE "MathSkill";

-- DropTable
DROP TABLE "StudentMathStatus";

-- DropTable
DROP TABLE "LiteracySkill";

-- DropTable
DROP TABLE "StudentLiteracyStatus";

-- CreateTable
CREATE TABLE "SkillSubject" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "skillSubjectId" TEXT NOT NULL,
    "category" TEXT,
    "skillName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSkillStatus" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkillStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillSubject_classroomId_name_key" ON "SkillSubject"("classroomId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSkillStatus_studentId_skillId_key" ON "StudentSkillStatus"("studentId", "skillId");

-- AddForeignKey
ALTER TABLE "SkillSubject" ADD CONSTRAINT "SkillSubject_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_skillSubjectId_fkey" FOREIGN KEY ("skillSubjectId") REFERENCES "SkillSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillStatus" ADD CONSTRAINT "StudentSkillStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillStatus" ADD CONSTRAINT "StudentSkillStatus_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

