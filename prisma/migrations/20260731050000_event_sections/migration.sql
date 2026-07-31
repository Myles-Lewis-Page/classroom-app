-- CreateTable
CREATE TABLE "_EventSections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventSections_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventSections_B_index" ON "_EventSections"("B");

-- AddForeignKey
ALTER TABLE "_EventSections" ADD CONSTRAINT "_EventSections_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSections" ADD CONSTRAINT "_EventSections_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

