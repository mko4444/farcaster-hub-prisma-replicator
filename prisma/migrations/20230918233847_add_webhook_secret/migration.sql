/*
  Warnings:

  - Added the required column `webhook_secret` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "webhook_secret" TEXT NOT NULL;
