# Farcaster Hub Replicator

This hub replicator is different from the WC team's in two ways:
- tables have relations wherever possible, making complex queries via prisma or graphql easier
- the database schema is more akin to the WC api than the hub message format (aka, easier to work with)

Finished:
backfill + streaming all cast, reaction, link, verification, and user data events

to-do:
- signer add / remove (backfill + streaming)
- handle any onchain events (backfill + streaming)
- username proofs (backfill + streaming)
- thread hash
- location (via a cron job calling Warpcast API for now)
- deploy instructions
- example of importing as a prisma client into a nextjs repo
