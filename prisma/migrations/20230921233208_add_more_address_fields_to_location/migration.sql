-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "country_long" TEXT,
ADD COLUMN     "country_short" TEXT,
ADD COLUMN     "formatted_address" TEXT,
ADD COLUMN     "locality_long" TEXT,
ADD COLUMN     "locality_short" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "state_long" TEXT,
ADD COLUMN     "state_short" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "utc_offset" INTEGER,
ADD COLUMN     "vicinity" TEXT;
