/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CORS is handled per-route/middleware in middleware.ts (utils/cors.ts) so
  // it can vary by environment (CLIENT_APP_URL) rather than being hardcoded
  // here. Keep this file free of API-specific config.
};

module.exports = nextConfig;
