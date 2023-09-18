-- CreateTable
CREATE TABLE "LocationUpdate" (
    "place_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "LocationUpdate_pkey" PRIMARY KEY ("place_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationUpdate_place_id_key" ON "LocationUpdate"("place_id");

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Location"("place_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;
