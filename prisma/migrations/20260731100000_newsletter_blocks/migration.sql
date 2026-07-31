-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "weekOf" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "renderedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterBlock" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "NewsletterBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterTemplate" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterTemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "NewsletterTemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Newsletter_classroomId_status_idx" ON "Newsletter"("classroomId", "status");

-- CreateIndex
CREATE INDEX "NewsletterBlock_newsletterId_order_idx" ON "NewsletterBlock"("newsletterId", "order");

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterBlock" ADD CONSTRAINT "NewsletterBlock_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterTemplate" ADD CONSTRAINT "NewsletterTemplate_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterTemplateBlock" ADD CONSTRAINT "NewsletterTemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NewsletterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

