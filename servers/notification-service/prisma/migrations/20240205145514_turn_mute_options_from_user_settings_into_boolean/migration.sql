/*
  Warnings:

  - The `ReplyTo` column on the `UserSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `Mention` column on the `UserSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `DirectMessage` column on the `UserSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "ReplyTo",
ADD COLUMN     "ReplyTo" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "Mention",
ADD COLUMN     "Mention" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "DirectMessage",
ADD COLUMN     "DirectMessage" BOOLEAN NOT NULL DEFAULT true;
