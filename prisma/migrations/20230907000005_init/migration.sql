-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('REACTION_TYPE_NONE', 'REACTION_TYPE_LIKE', 'REACTION_TYPE_RECAST');

-- CreateTable
CREATE TABLE "Cast" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3),
    "parent_hash" TEXT,
    "parent_url" TEXT,
    "text" TEXT,
    "fid" INTEGER NOT NULL,
    "mentions_positions" INTEGER[],
    "embedded_urls" TEXT[],

    CONSTRAINT "Cast_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "hash" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'REACTION_TYPE_NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fid" INTEGER NOT NULL,
    "target_hash" TEXT,
    "target_url" TEXT,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "User" (
    "fid" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "fname" TEXT,
    "pfp_url" TEXT,
    "bio" TEXT,
    "display_name" TEXT,
    "custody_address" TEXT,
    "url" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Verification" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fid" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "eth_signature" TEXT NOT NULL,
    "block_hash" TEXT NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Link" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,
    "target_fid" INTEGER NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "UserDataMessage" (
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "UserDataMessage_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "HubSubscription" (
    "url" TEXT NOT NULL,
    "last_event_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubSubscription_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "_CastEmbeds" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CastMentionedBy" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Cast_hash_key" ON "Cast"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_hash_key" ON "Reaction"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "User_fid_key" ON "User"("fid");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_hash_key" ON "Verification"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Link_hash_key" ON "Link"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "UserDataMessage_hash_key" ON "UserDataMessage"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "HubSubscription_url_key" ON "HubSubscription"("url");

-- CreateIndex
CREATE UNIQUE INDEX "_CastEmbeds_AB_unique" ON "_CastEmbeds"("A", "B");

-- CreateIndex
CREATE INDEX "_CastEmbeds_B_index" ON "_CastEmbeds"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CastMentionedBy_AB_unique" ON "_CastMentionedBy"("A", "B");

-- CreateIndex
CREATE INDEX "_CastMentionedBy_B_index" ON "_CastMentionedBy"("B");

-- AddForeignKey
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_parent_hash_fkey" FOREIGN KEY ("parent_hash") REFERENCES "Cast"("hash") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_target_hash_fkey" FOREIGN KEY ("target_hash") REFERENCES "Cast"("hash") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_target_fid_fkey" FOREIGN KEY ("target_fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserDataMessage" ADD CONSTRAINT "UserDataMessage_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_CastEmbeds" ADD CONSTRAINT "_CastEmbeds_A_fkey" FOREIGN KEY ("A") REFERENCES "Cast"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CastEmbeds" ADD CONSTRAINT "_CastEmbeds_B_fkey" FOREIGN KEY ("B") REFERENCES "Cast"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CastMentionedBy" ADD CONSTRAINT "_CastMentionedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "Cast"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CastMentionedBy" ADD CONSTRAINT "_CastMentionedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("fid") ON DELETE CASCADE ON UPDATE CASCADE;
