/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    MERKLE_SECRET: process.env.MERKLE_SECRET,
    SIMPLEHASH_KEY: process.env.SIMPLEHASH_KEY,
    SIMPLEHASH_SECRET: process.env.SIMPLEHASH_SECRET,
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
