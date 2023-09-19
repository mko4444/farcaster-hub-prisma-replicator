-- DropForeignKey
ALTER TABLE "_GroupMembers" DROP CONSTRAINT "_GroupMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_GroupMembers" DROP CONSTRAINT "_GroupMembers_B_fkey";

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "opt_address" TEXT;

-- CreateTable
CREATE TABLE "Address" (
    "address" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Address_address_key" ON "Address"("address");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_opt_address_fkey" FOREIGN KEY ("opt_address") REFERENCES "Address"("address") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Address"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
