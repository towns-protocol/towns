-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "BlockedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];
