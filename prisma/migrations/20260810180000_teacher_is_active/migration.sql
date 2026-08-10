-- Adds the isActive soft-delete flag to Teacher. This column was already
-- present in schema.prisma (used by the Principal's Remove/Restore teacher
-- feature) but no migration was ever generated for it, so it never actually
-- existed on the live database. Defaulting to true backfills every existing
-- Teacher row as active, which is correct - nobody has actually been removed.
ALTER TABLE "Teacher" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
