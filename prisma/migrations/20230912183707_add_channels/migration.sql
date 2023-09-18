-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "parent_url" TEXT NOT NULL,
    "name" TEXT,
    "pfp_url" TEXT,
    "has_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelToUser" (
    "id" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,
    "parent_url" TEXT NOT NULL,
    "last_read" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelToUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_parent_url_key" ON "Channel"("parent_url");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelToUser_parent_url_key" ON "ChannelToUser"("parent_url");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelToUser_fid_parent_url_key" ON "ChannelToUser"("fid", "parent_url");

-- AddForeignKey
ALTER TABLE "ChannelToUser" ADD CONSTRAINT "ChannelToUser_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelToUser" ADD CONSTRAINT "ChannelToUser_parent_url_fkey" FOREIGN KEY ("parent_url") REFERENCES "Channel"("parent_url") ON DELETE CASCADE ON UPDATE CASCADE;
