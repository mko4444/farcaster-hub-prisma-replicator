# Farcaster Hub Replicator
Syncs all data on the Farcaster protocol to a postgres instance. Tables have relations throughout and the schema is optimized for building frontend apps.

Warning: still in development. Don't use in production.

## Local Instructions

1. Clone the repo onto your machine.
2. Create a local postgres instance (you'll need postgres on your machine), then, run the following two commands:
   - `psql postgres`
   - `CREATE DATABASE fc-postgres;
CREATE USER myuser WITH ENCRYPTED PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydatabase TO myuser;
\q`
3. Your connection string should be like so: `postgresql://myuser:mypassword@localhost:5432/mydatabase`. Create a `.env` file in the root of the project and paste it in as the `DATABASE_URL` variable.
4. To start the indexer, run the following command: `npm run setup && npm start`
5. To view your data, run `npx prisma studio` in a second terminal window. It'll take a few hours to sync all historical data, but new casts will start appearing immediately.
6. To reset the database, run `npm run reset`.

## Deploy Instructions 

1. Clone the repo.
2. Create a supabase project (you'll need to pay for a pro instance, which is $25/mo). Copy your connection string, you'll need it later.
3. Set up a background worker on a service such as Railway and link it to the cloned repo. Before deploying, add your connection string as the `DATABASE_URL` environment variable.
4. That's it! The data should start appearing in your supabase instance. You can query it there or run `npx prisma studio` locally in the root of the project folder.
