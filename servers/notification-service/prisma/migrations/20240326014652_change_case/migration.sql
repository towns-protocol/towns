/*
Warnings:
- The primary key for the `SyncedStream` table will be changed. If it partially fails, the table could be left without primary key constraint.
- You are about to drop the column `kind` on the `SyncedStream` table. All the data in the column will be lost.
- You are about to drop the column `streamId` on the `SyncedStream` table. All the data in the column will be lost.
- You are about to drop the column `syncCookie` on the `SyncedStream` table. All the data in the column will be lost.
- You are about to drop the column `userIds` on the `SyncedStream` table. All the data in the column will be lost.
- Added the required column `Kind` to the `SyncedStream` table without a default value. This is not possible if the table is not empty.
- Added the required column `StreamId` to the `SyncedStream` table without a default value. This is not possible if the table is not empty.
- Added the required column `SyncCookie` to the `SyncedStream` table without a default value. This is not possible if the table is not empty.
*/
-- AlterTable
ALTER TABLE "SyncedStream"
DROP CONSTRAINT "SyncedStream_pkey",
ADD COLUMN     "Kind" "StreamKind",
ADD COLUMN     "StreamId" TEXT,
ADD COLUMN     "SyncCookie" TEXT,
ADD COLUMN     "UserIds" TEXT[];

-- migrate the data to the new columns
UPDATE "SyncedStream"
SET
    "Kind" = "kind",
    "StreamId" = "streamId",
    "SyncCookie" = "syncCookie",
    "UserIds" = "userIds";

ALTER TABLE "SyncedStream"
DROP COLUMN "kind",
DROP COLUMN "streamId",
DROP COLUMN "syncCookie",
DROP COLUMN "userIds",
ADD CONSTRAINT "SyncedStream_pkey" PRIMARY KEY ("StreamId");

-- add the not null constraint to the new columns
ALTER TABLE "SyncedStream"
ALTER COLUMN "Kind" SET NOT NULL,
ALTER COLUMN "StreamId" SET NOT NULL,
ALTER COLUMN "SyncCookie" SET NOT NULL;
