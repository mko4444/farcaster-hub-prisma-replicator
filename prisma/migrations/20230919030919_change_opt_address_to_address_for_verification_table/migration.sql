/*
  Warnings:

  - Made the column `address` on table `Verification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "address" SET DEFAULT '0x000';
