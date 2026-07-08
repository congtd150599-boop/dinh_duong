-- Replace the plain isActive boolean with a 3-state status field
-- ('pending' | 'active' | 'disabled') so self-registered accounts awaiting
-- admin approval are a distinct, unambiguous state from an admin-deactivated
-- account. Existing rows are migrated by value (not just defaulted) so no
-- account's current access is silently changed by this migration.
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

UPDATE "User" SET "status" = CASE WHEN "isActive" THEN 'active' ELSE 'disabled' END;

ALTER TABLE "User" DROP COLUMN "isActive";
