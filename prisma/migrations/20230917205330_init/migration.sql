-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_target_url_fkey" FOREIGN KEY ("target_url") REFERENCES "Channel"("parent_url") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_target_url_fkey" FOREIGN KEY ("target_url") REFERENCES "Channel"("parent_url") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Recast" ADD CONSTRAINT "Recast_target_url_fkey" FOREIGN KEY ("target_url") REFERENCES "Channel"("parent_url") ON DELETE NO ACTION ON UPDATE NO ACTION;
