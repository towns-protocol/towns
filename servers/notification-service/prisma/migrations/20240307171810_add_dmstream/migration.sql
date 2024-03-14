-- CreateTable
CREATE TABLE "DMStream" (
    "streamId" TEXT NOT NULL,
    "firstUserId" TEXT NOT NULL,
    "secondUserId" TEXT NOT NULL,

    CONSTRAINT "DMStream_pkey" PRIMARY KEY ("streamId")
);
