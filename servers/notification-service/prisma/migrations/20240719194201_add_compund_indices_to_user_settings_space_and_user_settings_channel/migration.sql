/*
  Warnings:

  - The primary key for the `UserSettingsChannel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserSettingsSpace` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserSettingsChannel" DROP CONSTRAINT "UserSettingsChannel_pkey",
ADD CONSTRAINT "UserSettingsChannel_pkey" PRIMARY KEY ("UserId", "ChannelId");

-- AlterTable
ALTER TABLE "UserSettingsSpace" DROP CONSTRAINT "UserSettingsSpace_pkey",
ADD CONSTRAINT "UserSettingsSpace_pkey" PRIMARY KEY ("UserId", "SpaceId");

-- CreateIndex
CREATE INDEX "UserSettingsChannel_ChannelId_UserId_idx" ON "UserSettingsChannel"("ChannelId", "UserId");

-- CreateIndex
CREATE INDEX "UserSettingsSpace_SpaceId_UserId_idx" ON "UserSettingsSpace"("SpaceId", "UserId");
