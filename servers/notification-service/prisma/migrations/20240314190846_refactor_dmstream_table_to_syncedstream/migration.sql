/*
  Warnings:

  - You are about to drop the `DMStream` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StreamKind" AS ENUM ('DM', 'GDM', 'Channel');

-- DropTable
DROP TABLE "DMStream";

-- CreateTable
CREATE TABLE "SyncedStream" (
    "streamId" TEXT NOT NULL,
    "userIds" TEXT[],
    "kind" "StreamKind" NOT NULL,
    "syncCookie" TEXT NOT NULL,

    CONSTRAINT "SyncedStream_pkey" PRIMARY KEY ("streamId")
);
