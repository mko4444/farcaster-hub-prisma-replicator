-- RenameColumn
ALTER TABLE "Verification" RENAME COLUMN "opt_address" TO "address";

-- AdjustForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_opt_address_fkey";
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_address_fkey" FOREIGN KEY ("address") REFERENCES "Address"("address") ON DELETE NO ACTION ON UPDATE NO ACTION;
