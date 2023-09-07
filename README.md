# Farcaster Hub Replicator

This hub replicator is different from the WC team's in two ways:
- tables have relations wherever possible, making complex queries via prisma or graphql easier
- the database schema is more akin to the WC api than the hub message format (aka, easier to work with)

## Instructions

1. Clone the repo onto your machine.
2. Either create a Supabase instance or a local postgres instance. If you have postgres installed, you can run the following commands to do that:
`psql postgres`
`CREATE DATABASE fc-postgres;
CREATE USER myuser WITH ENCRYPTED PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydatabase TO myuser;
\q`
3. Copy your connection string. If you're using local postgres it should be `postgresql://myuser:mypassword@localhost:5432/mydatabase`, and if you're using Supabase it will be on the settings page of the dashboard.
4. In the root of the project, run the command `npm run setup` to initialize the database.
5. Then run `npm run start` to begin indexing data.
