/*
  Warnings:

  - The `ChannelMute` column on the `UserSettingsChannel` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `SpaceMute` column on the `UserSettingsSpace` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Mute" AS ENUM ('Default', 'Unmuted', 'Muted');

-- AlterTable
ALTER TABLE "UserSettingsChannel" DROP COLUMN "ChannelMute",
ADD COLUMN     "ChannelMute" "Mute" NOT NULL DEFAULT 'Default';

-- AlterTable
ALTER TABLE "UserSettingsSpace" DROP COLUMN "SpaceMute",
ADD COLUMN     "SpaceMute" "Mute" NOT NULL DEFAULT 'Default';
