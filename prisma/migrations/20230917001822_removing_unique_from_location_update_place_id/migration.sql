/*
  Warnings:

  - The primary key for the `LocationUpdate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `LocationUpdate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[place_id,fid,timestamp]` on the table `LocationUpdate` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `LocationUpdate` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "LocationUpdate_place_id_key";

-- AlterTable
ALTER TABLE "LocationUpdate" DROP CONSTRAINT "LocationUpdate_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "LocationUpdate_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "LocationUpdate_id_key" ON "LocationUpdate"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LocationUpdate_place_id_fid_timestamp_key" ON "LocationUpdate"("place_id", "fid", "timestamp");
