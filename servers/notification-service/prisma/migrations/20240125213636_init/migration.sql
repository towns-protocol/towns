-- CreateTable
CREATE TABLE "NotificationTag" (
    "SpaceId" TEXT NOT NULL,
    "ChannelId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Tag" TEXT NOT NULL,

    CONSTRAINT "NotificationTag_pkey" PRIMARY KEY ("ChannelId","UserId")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "PushType" TEXT NOT NULL DEFAULT 'web-push',
    "UserId" TEXT NOT NULL,
    "PushSubscription" TEXT NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("PushSubscription")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "UserId" TEXT NOT NULL,
    "ReplyTo" INTEGER NOT NULL DEFAULT 1,
    "Mention" INTEGER NOT NULL DEFAULT 1,
    "DirectMessage" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("UserId")
);

-- CreateTable
CREATE TABLE "UserSettingsChannel" (
    "SpaceId" TEXT NOT NULL,
    "ChannelId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "ChannelMute" TEXT NOT NULL DEFAULT 'default',

    CONSTRAINT "UserSettingsChannel_pkey" PRIMARY KEY ("ChannelId","UserId")
);

-- CreateTable
CREATE TABLE "UserSettingsSpace" (
    "SpaceId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "SpaceMute" TEXT NOT NULL DEFAULT 'default',

    CONSTRAINT "UserSettingsSpace_pkey" PRIMARY KEY ("SpaceId","UserId")
);

-- CreateIndex
CREATE INDEX "idx_user_id" ON "PushSubscription"("UserId");

-- AddForeignKey
ALTER TABLE "UserSettingsChannel" ADD CONSTRAINT "UserSettingsChannel_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "UserSettings"("UserId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserSettingsSpace" ADD CONSTRAINT "UserSettingsSpace_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "UserSettings"("UserId") ON DELETE CASCADE ON UPDATE NO ACTION;
