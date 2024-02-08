/*
  Warnings:

  - The values [Default,Unmuted,Muted] on the enum `Mute` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Mute_new" AS ENUM ('default', 'unmuted', 'muted');
ALTER TABLE "UserSettingsChannel" ALTER COLUMN "ChannelMute" DROP DEFAULT;
ALTER TABLE "UserSettingsSpace" ALTER COLUMN "SpaceMute" DROP DEFAULT;
ALTER TABLE "UserSettingsChannel" ALTER COLUMN "ChannelMute" TYPE "Mute_new" USING ("ChannelMute"::text::"Mute_new");
ALTER TABLE "UserSettingsSpace" ALTER COLUMN "SpaceMute" TYPE "Mute_new" USING ("SpaceMute"::text::"Mute_new");
ALTER TYPE "Mute" RENAME TO "Mute_old";
ALTER TYPE "Mute_new" RENAME TO "Mute";
DROP TYPE "Mute_old";
ALTER TABLE "UserSettingsChannel" ALTER COLUMN "ChannelMute" SET DEFAULT 'default';
ALTER TABLE "UserSettingsSpace" ALTER COLUMN "SpaceMute" SET DEFAULT 'default';
COMMIT;

-- AlterTable
ALTER TABLE "UserSettingsChannel" ALTER COLUMN "ChannelMute" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "UserSettingsSpace" ALTER COLUMN "SpaceMute" SET DEFAULT 'default';
