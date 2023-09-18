/*
  Warnings:

  - The primary key for the `Channel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `has_data` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `pfp_url` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the `ChannelToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChannelToUser" DROP CONSTRAINT "ChannelToUser_fid_fkey";

-- DropForeignKey
ALTER TABLE "ChannelToUser" DROP CONSTRAINT "ChannelToUser_parent_url_fkey";

-- AlterTable
ALTER TABLE "Channel" DROP CONSTRAINT "Channel_pkey",
DROP COLUMN "has_data",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "pfp_url",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "Channel_pkey" PRIMARY KEY ("parent_url");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "last_location_id" TEXT;

-- DropTable
DROP TABLE "ChannelToUser";

-- CreateTable
CREATE TABLE "Group" (
    "fid" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "group_fid" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fid" INTEGER NOT NULL,
    "target_hash" TEXT,
    "target_url" TEXT,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Recast" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fid" INTEGER NOT NULL,
    "target_hash" TEXT,
    "target_url" TEXT,

    CONSTRAINT "Recast_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Location" (
    "place_id" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("place_id")
);

-- CreateTable
CREATE TABLE "_GroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ContractToGroup" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_fid_key" ON "Group"("fid");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_id_key" ON "Contract"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_address_chain_key" ON "Contract"("address", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "Like_hash_key" ON "Like"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Recast_hash_key" ON "Recast"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Location_place_id_key" ON "Location"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "_GroupMembers_AB_unique" ON "_GroupMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupMembers_B_index" ON "_GroupMembers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ContractToGroup_AB_unique" ON "_ContractToGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractToGroup_B_index" ON "_ContractToGroup"("B");

-- AddForeignKey
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_parent_url_fkey" FOREIGN KEY ("parent_url") REFERENCES "Channel"("parent_url") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_target_hash_fkey" FOREIGN KEY ("target_hash") REFERENCES "Cast"("hash") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Recast" ADD CONSTRAINT "Recast_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Recast" ADD CONSTRAINT "Recast_target_hash_fkey" FOREIGN KEY ("target_hash") REFERENCES "Cast"("hash") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_last_location_id_fkey" FOREIGN KEY ("last_location_id") REFERENCES "Location"("place_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "Verification"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToGroup" ADD CONSTRAINT "_ContractToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToGroup" ADD CONSTRAINT "_ContractToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "Group"("fid") ON DELETE CASCADE ON UPDATE CASCADE;
