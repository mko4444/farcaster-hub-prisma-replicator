/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    MERKLE_SECRET: process.env.MERKLE_SECRET,
    SIMPLEHASH_KEY: process.env.SIMPLEHASH_KEY,
    SIMPLEHASH_SECRET: process.env.SIMPLEHASH_SECRET,
    SIMPLEHASH_WEBHOOK_URL: process.env.SIMPLEHASH_WEBHOOK_URL,
    GMAPS_KEY: process.env.GMAPS_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
