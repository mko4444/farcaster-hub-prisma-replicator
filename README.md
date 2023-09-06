# farcaster-hub-prisma-replicator
 store farcaster hub data in a way that makes it easy to query via prisma

backfill + streaming all offchain events is finished

needs to be implemented:
- signer add / remove
- any onchain events
- username proofs
- thread hash
- location (via a cron job calling Warpcast API for now)
- deploy instructions
- example of importing as a prisma client into a nextjs repo
